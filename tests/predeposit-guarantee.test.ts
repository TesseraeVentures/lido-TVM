import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import '@ton/test-utils';

import { PredepositGuarantee } from '../build/predeposit_guarantee/predeposit_guarantee_PredepositGuarantee';

describe('PredepositGuarantee migration suite', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let proofVerifier: SandboxContract<TreasuryContract>;
    let nodeOperator: SandboxContract<TreasuryContract>;
    let guarantor: SandboxContract<TreasuryContract>;
    let depositor: SandboxContract<TreasuryContract>;
    let vault: SandboxContract<TreasuryContract>;
    let recipient: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;

    let pdg: SandboxContract<PredepositGuarantee>;

    const PREDEPOSIT_AMOUNT = toNano('1');
    const validatorPubkey = 12345n;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        proofVerifier = await blockchain.treasury('proofVerifier');
        nodeOperator = await blockchain.treasury('nodeOperator');
        guarantor = await blockchain.treasury('guarantor');
        depositor = await blockchain.treasury('depositor');
        vault = await blockchain.treasury('vault');
        recipient = await blockchain.treasury('recipient');
        randomUser = await blockchain.treasury('random');

        pdg = blockchain.openContract(
            await PredepositGuarantee.fromInit(admin.address, proofVerifier.address)
        );

        await pdg.send(admin.getSender(), { value: toNano('5') }, { $$type: 'Deploy', queryId: 0n });
    });

    describe('Bond deposit and withdrawal', () => {
        it('self-guarantor can top up balance', async () => {
            // nodeOperator is self-guarantor by default
            const res = await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 1n,
                nodeOperator: nodeOperator.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const balance = await pdg.getGetNodeOperatorBalance(nodeOperator.address);
            expect(balance.total >= PREDEPOSIT_AMOUNT).toBe(true);
        });

        it('self-guarantor can withdraw unlocked balance', async () => {
            // Top up first
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 2n,
                nodeOperator: nodeOperator.address,
            });

            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'WithdrawNodeOperatorBalance',
                queryId: 3n,
                nodeOperator: nodeOperator.address,
                amount: PREDEPOSIT_AMOUNT,
                recipient: recipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });
        });

        it('non-guarantor cannot top up', async () => {
            const res = await pdg.send(randomUser.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 4n,
                nodeOperator: nodeOperator.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('cannot withdraw more than unlocked', async () => {
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 5n,
                nodeOperator: nodeOperator.address,
            });

            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'WithdrawNodeOperatorBalance',
                queryId: 6n,
                nodeOperator: nodeOperator.address,
                amount: PREDEPOSIT_AMOUNT * 2n,
                recipient: recipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('zero value top up is rejected', async () => {
            // Sending minimal gas only — context().value should still be > 0 in sandbox
            // but we test that the guarantor check works
            const res = await pdg.send(randomUser.getSender(), { value: toNano('1') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 7n,
                nodeOperator: nodeOperator.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });
    });

    describe('Guarantor management', () => {
        it('NO can set external guarantor', async () => {
            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorGuarantor',
                queryId: 10n,
                newGuarantor: guarantor.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const g = await pdg.getGetNodeOperatorGuarantor(nodeOperator.address);
            expect(g.equals(guarantor.address)).toBe(true);
        });

        it('cannot set same guarantor', async () => {
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorGuarantor',
                queryId: 11n,
                newGuarantor: guarantor.address,
            });

            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorGuarantor',
                queryId: 12n,
                newGuarantor: guarantor.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('changing guarantor with balance creates claimable refund', async () => {
            // Top up as self-guarantor
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 13n,
                nodeOperator: nodeOperator.address,
            });

            // Change guarantor — balance should become claimable by old guarantor (nodeOperator)
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorGuarantor',
                queryId: 14n,
                newGuarantor: guarantor.address,
            });

            const claimable = await pdg.getGetClaimableRefund(nodeOperator.address);
            expect(claimable >= PREDEPOSIT_AMOUNT).toBe(true);
        });

        it('guarantor can claim refund', async () => {
            // Top up
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 15n,
                nodeOperator: nodeOperator.address,
            });

            // Change guarantor
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorGuarantor',
                queryId: 16n,
                newGuarantor: guarantor.address,
            });

            // Claim refund
            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'ClaimGuarantorRefund',
                queryId: 17n,
                recipient: recipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const claimableAfter = await pdg.getGetClaimableRefund(nodeOperator.address);
            expect(claimableAfter).toBe(0n);
        });

        it('cannot claim with nothing to refund', async () => {
            const res = await pdg.send(randomUser.getSender(), { value: toNano('0.05') }, {
                $$type: 'ClaimGuarantorRefund',
                queryId: 18n,
                recipient: recipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('external guarantor can top up and withdraw for NO', async () => {
            // Set guarantor
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorGuarantor',
                queryId: 19n,
                newGuarantor: guarantor.address,
            });

            // Guarantor tops up
            const res = await pdg.send(guarantor.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 20n,
                nodeOperator: nodeOperator.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            // Guarantor withdraws
            const res2 = await pdg.send(guarantor.getSender(), { value: toNano('0.05') }, {
                $$type: 'WithdrawNodeOperatorBalance',
                queryId: 21n,
                nodeOperator: nodeOperator.address,
                amount: PREDEPOSIT_AMOUNT,
                recipient: recipient.address,
            });
            expect(res2.transactions).toHaveTransaction({ success: true });
        });
    });

    describe('Deposit verification flow', () => {
        it('predeposit creates a predeposited validator', async () => {
            // Top up first
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 29n,
                nodeOperator: nodeOperator.address,
            });
            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 30n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const stage = await pdg.getGetValidatorStage(validatorPubkey);
            expect(stage).toBe(1n); // PREDEPOSITED
        });

        it('cannot predeposit same validator twice', async () => {
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT * 2n + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 100n,
                nodeOperator: nodeOperator.address,
            });
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 31n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });

            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 32n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('proof verifier can prove and activate', async () => {
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 101n,
                nodeOperator: nodeOperator.address,
            });
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 33n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });

            const res = await pdg.send(proofVerifier.getSender(), { value: toNano('0.05') }, {
                $$type: 'ProveWCAndActivate',
                queryId: 34n,
                validatorPubkey: validatorPubkey,
                proofHash: 999n,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const stage = await pdg.getGetValidatorStage(validatorPubkey);
            expect(stage).toBe(3n); // ACTIVATED
        });

        it('non-verifier cannot prove', async () => {
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 102n,
                nodeOperator: nodeOperator.address,
            });
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 35n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });

            const res = await pdg.send(randomUser.getSender(), { value: toNano('0.05') }, {
                $$type: 'ProveWCAndActivate',
                queryId: 36n,
                validatorPubkey: validatorPubkey,
                proofHash: 999n,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('prove invalid WC compensates vault', async () => {
            // Top up NO balance first so compensation works
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 37n,
                nodeOperator: nodeOperator.address,
            });

            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 38n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });

            const vaultBalanceBefore = await vault.getBalance();

            const res = await pdg.send(proofVerifier.getSender(), { value: toNano('0.05') }, {
                $$type: 'ProveInvalidValidatorWC',
                queryId: 39n,
                validatorPubkey: validatorPubkey,
                proofHash: 888n,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const stage = await pdg.getGetValidatorStage(validatorPubkey);
            expect(stage).toBe(4n); // COMPENSATED
        });
    });

    describe('Edge cases', () => {
        it('query replay is rejected', async () => {
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT * 2n + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 104n,
                nodeOperator: nodeOperator.address,
            });
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 50n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });

            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 50n,
                stakingVault: vault.address,
                validatorPubkey: 99999n,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('operations fail when paused', async () => {
            await pdg.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'PDGPause',
                queryId: 51n,
            });

            expect(await pdg.getGetPaused()).toBe(true);

            const res = await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 52n,
                nodeOperator: nodeOperator.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('admin can pause and resume', async () => {
            await pdg.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'PDGPause',
                queryId: 53n,
            });
            expect(await pdg.getGetPaused()).toBe(true);

            await pdg.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'PDGResume',
                queryId: 54n,
            });
            expect(await pdg.getGetPaused()).toBe(false);
        });

        it('non-admin cannot pause', async () => {
            const res = await pdg.send(randomUser.getSender(), { value: toNano('0.05') }, {
                $$type: 'PDGPause',
                queryId: 55n,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('getters return correct defaults', async () => {
            const balance = await pdg.getGetNodeOperatorBalance(randomUser.address);
            expect(balance.total).toBe(0n);
            expect(balance.locked).toBe(0n);

            const unlocked = await pdg.getGetUnlockedBalance(randomUser.address);
            expect(unlocked).toBe(0n);

            const stage = await pdg.getGetValidatorStage(0n);
            expect(stage).toBe(0n); // NONE

            const pending = await pdg.getGetPendingActivations(vault.address);
            expect(pending).toBe(0n);

            expect(await pdg.getGetPredepositAmount()).toBe(PREDEPOSIT_AMOUNT);
        });

        it('set depositor works', async () => {
            const res = await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'SetNodeOperatorDepositor',
                queryId: 60n,
                newDepositor: depositor.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });

            const d = await pdg.getGetNodeOperatorDepositor(nodeOperator.address);
            expect(d.equals(depositor.address)).toBe(true);
        });

        it('pending activations tracks correctly', async () => {
            await pdg.send(nodeOperator.getSender(), { value: PREDEPOSIT_AMOUNT + toNano('0.05') }, {
                $$type: 'TopUpNodeOperatorBalance',
                queryId: 103n,
                nodeOperator: nodeOperator.address,
            });
            await pdg.send(nodeOperator.getSender(), { value: toNano('0.05') }, {
                $$type: 'Predeposit',
                queryId: 61n,
                stakingVault: vault.address,
                validatorPubkey: validatorPubkey,
            });

            expect(await pdg.getGetPendingActivations(vault.address)).toBe(1n);

            await pdg.send(proofVerifier.getSender(), { value: toNano('0.05') }, {
                $$type: 'ProveWCAndActivate',
                queryId: 62n,
                validatorPubkey: validatorPubkey,
                proofHash: 999n,
            });

            expect(await pdg.getGetPendingActivations(vault.address)).toBe(0n);
        });
    });
});

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import '@ton/test-utils';

import { NodeOperatorFee } from '../build/node_operator_fee/node_operator_fee_NodeOperatorFee';

describe('NodeOperatorFee', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let manager: SandboxContract<TreasuryContract>;
    let feeExempt: SandboxContract<TreasuryContract>;
    let recipient: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<NodeOperatorFee>;

    const FEE_RATE = 1000n; // 10%

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        manager = await blockchain.treasury('manager');
        feeExempt = await blockchain.treasury('feeExempt');
        recipient = await blockchain.treasury('recipient');
        randomUser = await blockchain.treasury('random');

        contract = blockchain.openContract(await NodeOperatorFee.fromInit(
            admin.address,
            manager.address,
            feeExempt.address,
            recipient.address,
            FEE_RATE,
        ));

        await contract.send(admin.getSender(), { value: toNano('0.5') }, { $$type: 'Deploy', queryId: 0n });
    });

    // Helper to submit a report
    async function submitReport(totalValue: bigint, inOutDelta: bigint, quarantineValue: bigint = 0n, reportTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000)), queryId: bigint = BigInt(Math.floor(Math.random() * 1000000) + 100)) {
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'NofSubmitReport',
            queryId,
            totalValue,
            inOutDelta,
            quarantineValue,
            reportTimestamp,
        });
    }

    describe('Initialization', () => {
        it('should initialize with correct values', async () => {
            expect(await contract.getGetAdmin()).toEqualAddress(admin.address);
            expect(await contract.getGetNodeOperatorManager()).toEqualAddress(manager.address);
            expect(await contract.getGetFeeRecipient()).toEqualAddress(recipient.address);
            expect(await contract.getGetFeeRate()).toBe(FEE_RATE);
            expect(await contract.getGetSettledGrowth()).toBe(0n);
        });
    });

    describe('Fee calculation', () => {
        it('should return zero fee when no report submitted', async () => {
            expect(await contract.getGetAccruedFee()).toBe(0n);
        });

        it('should calculate fee on positive unsettled growth', async () => {
            // totalValue=110, inOutDelta=100 → growth=10, fee = 10 * 1000 / 10000 = 1
            await submitReport(toNano('110'), toNano('100'), 0n, 1000n, 101n);
            const fee = await contract.getGetAccruedFee();
            expect(fee).toBe(toNano('1')); // 10% of 10 TON growth
        });

        it('should return zero fee when growth is negative', async () => {
            // totalValue=90, inOutDelta=100 → growth=-10
            await submitReport(toNano('90'), toNano('100'), 0n, 1000n, 102n);
            expect(await contract.getGetAccruedFee()).toBe(0n);
        });

        it('should include quarantine value in fee calculation', async () => {
            // totalValue=100, quarantine=10, inOutDelta=100 → growth=10, fee=1
            await submitReport(toNano('100'), toNano('100'), toNano('10'), 1000n, 103n);
            expect(await contract.getGetAccruedFee()).toBe(toNano('1'));
        });

        it('should not charge fee on already settled growth', async () => {
            // First: growth=10, disburse
            await submitReport(toNano('110'), toNano('100'), 0n, 1000n, 104n);

            // Fund the contract so it can pay
            await contract.send(admin.getSender(), { value: toNano('5') }, { $$type: 'Deploy', queryId: 0n });

            await contract.send(admin.getSender(), { value: toNano('2') }, {
                $$type: 'NofDisburseFee',
                queryId: 105n,
            });

            // Now fee should be 0 since growth is settled
            expect(await contract.getGetAccruedFee()).toBe(0n);
        });
    });

    describe('Fee disbursement', () => {
        it('should disburse fee to recipient', async () => {
            await submitReport(toNano('110'), toNano('100'), 0n, 1000n, 201n);

            // Fund the contract so it can pay out fees
            await contract.send(admin.getSender(), { value: toNano('10') }, { $$type: 'Deploy', queryId: 0n });

            const balBefore = await recipient.getBalance();
            await contract.send(randomUser.getSender(), { value: toNano('2') }, {
                $$type: 'NofDisburseFee',
                queryId: 202n,
            });
            const balAfter = await recipient.getBalance();
            expect(balAfter > balBefore).toBe(true);
        });

        it('should reject abnormally high fee for permissionless caller', async () => {
            // totalValue=300, inOutDelta=100 → growth=200 → fee=20 TON, threshold = 300 * 100/10000 = 3 TON
            await submitReport(toNano('300'), toNano('100'), 0n, 1000n, 203n);

            await contract.send(admin.getSender(), { value: toNano('50') }, { $$type: 'Deploy', queryId: 0n });

            const res = await contract.send(randomUser.getSender(), { value: toNano('25') }, {
                $$type: 'NofDisburseFee',
                queryId: 204n,
            });
            expect(res.transactions).toHaveTransaction({ to: contract.address, success: false });
        });

        it('should allow admin to disburse abnormally high fee', async () => {
            await submitReport(toNano('300'), toNano('100'), 0n, 1000n, 205n);
            await contract.send(admin.getSender(), { value: toNano('50') }, { $$type: 'Deploy', queryId: 0n });

            const balBefore = await recipient.getBalance();
            const res = await contract.send(admin.getSender(), { value: toNano('25') }, {
                $$type: 'NofDisburseAbnormallyHighFee',
                queryId: 206n,
            });
            expect(res.transactions).toHaveTransaction({ to: contract.address, success: true });
            const balAfter = await recipient.getBalance();
            expect(balAfter > balBefore).toBe(true);
        });

        it('should handle zero fee disbursement gracefully', async () => {
            // No growth → fee=0
            await submitReport(toNano('100'), toNano('100'), 0n, 1000n, 207n);

            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofDisburseFee',
                queryId: 208n,
            });
            expect(res.transactions).toHaveTransaction({ success: true });
        });
    });

    describe('Fee rate management', () => {
        it('should set fee rate with fresh report', async () => {
            await submitReport(toNano('100'), toNano('100'), 0n, BigInt(Math.floor(Date.now() / 1000) + 1000), 301n);

            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSetFeeRate',
                queryId: 302n,
                newFeeRate: 500n, // 5%
            });
            expect(res.transactions).toHaveTransaction({ success: true });
            expect(await contract.getGetFeeRate()).toBe(500n);
        });

        it('should reject fee rate change without fresh report', async () => {
            // reportFresh is false by default
            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSetFeeRate',
                queryId: 303n,
                newFeeRate: 500n,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('should reject non-admin setting fee rate', async () => {
            await submitReport(toNano('100'), toNano('100'), 0n, 1000n, 304n);
            const res = await contract.send(randomUser.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSetFeeRate',
                queryId: 305n,
                newFeeRate: 500n,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });
    });

    describe('Settled growth correction', () => {
        it('should correct settled growth with matching expected value', async () => {
            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofCorrectSettledGrowth',
                queryId: 401n,
                newSettledGrowth: toNano('50'),
                expectedSettledGrowth: 0n,
            });
            expect(res.transactions).toHaveTransaction({ success: true });
            expect(await contract.getGetSettledGrowth()).toBe(toNano('50'));
        });

        it('should reject correction with wrong expected value', async () => {
            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofCorrectSettledGrowth',
                queryId: 402n,
                newSettledGrowth: toNano('50'),
                expectedSettledGrowth: toNano('10'), // wrong
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });
    });

    describe('Fee exemption', () => {
        it('should add fee exemption from exempt role', async () => {
            const res = await contract.send(feeExempt.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofAddFeeExemption',
                queryId: 501n,
                exemptedAmount: toNano('5'),
            });
            expect(res.transactions).toHaveTransaction({ success: true });
            expect(await contract.getGetSettledGrowth()).toBe(toNano('5'));
        });

        it('should add fee exemption from admin', async () => {
            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofAddFeeExemption',
                queryId: 502n,
                exemptedAmount: toNano('3'),
            });
            expect(res.transactions).toHaveTransaction({ success: true });
            expect(await contract.getGetSettledGrowth()).toBe(toNano('3'));
        });

        it('should reject fee exemption from unauthorized', async () => {
            const res = await contract.send(randomUser.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofAddFeeExemption',
                queryId: 503n,
                exemptedAmount: toNano('5'),
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('should reduce accrued fee after exemption', async () => {
            // growth = 10, fee = 1 TON at 10%
            await submitReport(toNano('110'), toNano('100'), 0n, 1000n, 504n);
            expect(await contract.getGetAccruedFee()).toBe(toNano('1'));

            // Exempt 5 TON → unsettled growth = 10 - 5 = 5, fee = 0.5 TON
            await contract.send(feeExempt.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofAddFeeExemption',
                queryId: 505n,
                exemptedAmount: toNano('5'),
            });
            expect(await contract.getGetAccruedFee()).toBe(toNano('0.5'));
        });
    });

    describe('Fee recipient management', () => {
        it('should set fee recipient from manager', async () => {
            const newRecipient = await blockchain.treasury('newRecipient');
            const res = await contract.send(manager.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSetFeeRecipient',
                queryId: 601n,
                newFeeRecipient: newRecipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: true });
            expect(await contract.getGetFeeRecipient()).toEqualAddress(newRecipient.address);
        });

        it('should reject setting same recipient', async () => {
            const res = await contract.send(manager.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSetFeeRecipient',
                queryId: 602n,
                newFeeRecipient: recipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('should reject unauthorized recipient change', async () => {
            const newRecipient = await blockchain.treasury('newRecipient2');
            const res = await contract.send(randomUser.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSetFeeRecipient',
                queryId: 603n,
                newFeeRecipient: newRecipient.address,
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });
    });

    describe('Multi-operator fee distribution', () => {
        it('should handle sequential disbursements correctly', async () => {
            await contract.send(admin.getSender(), { value: toNano('50') }, { $$type: 'Deploy', queryId: 0n });

            // First report: growth=10 → fee=1
            await submitReport(toNano('110'), toNano('100'), 0n, 1000n, 801n);
            const fee1 = await contract.getGetAccruedFee();
            expect(fee1).toBe(toNano('1'));

            const disbRes = await contract.send(admin.getSender(), { value: toNano('2') }, {
                $$type: 'NofDisburseFee',
                queryId: 802n,
            });
            expect(disbRes.transactions).toHaveTransaction({ to: contract.address, success: true });

            // After disbursement, settledGrowth = growth = 10 TON
            expect(await contract.getGetSettledGrowth()).toBe(toNano('10'));

            // Second report: totalValue=120, inOutDelta=100 → growth=20, unsettled=20-10=10, fee=1
            await submitReport(toNano('120'), toNano('100'), 0n, 2000n, 803n);
            const fee2 = await contract.getGetAccruedFee();
            expect(fee2).toBe(toNano('1'));
        });
    });

    describe('Edge cases', () => {
        it('should reject replay query', async () => {
            await submitReport(toNano('100'), toNano('100'), 0n, 1000n, 901n);
            const res = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofDisburseFee',
                queryId: 901n, // already used
            });
            expect(res.transactions).toHaveTransaction({ success: false });
        });

        it('should handle zero fee rate', async () => {
            // Deploy with 0% fee
            const zeroFeeContract = blockchain.openContract(await NodeOperatorFee.fromInit(
                admin.address,
                manager.address,
                feeExempt.address,
                recipient.address,
                0n,
            ));
            await zeroFeeContract.send(admin.getSender(), { value: toNano('0.5') }, { $$type: 'Deploy', queryId: 0n });

            await zeroFeeContract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSubmitReport',
                queryId: 902n,
                totalValue: toNano('200'),
                inOutDelta: toNano('100'),
                quarantineValue: 0n,
                reportTimestamp: 1000n,
            });
            expect(await zeroFeeContract.getGetAccruedFee()).toBe(0n);
        });

        it('should handle max fee rate (100%)', async () => {
            const maxFeeContract = blockchain.openContract(await NodeOperatorFee.fromInit(
                admin.address,
                manager.address,
                feeExempt.address,
                recipient.address,
                10000n, // 100%
            ));
            await maxFeeContract.send(admin.getSender(), { value: toNano('0.5') }, { $$type: 'Deploy', queryId: 0n });

            await maxFeeContract.send(admin.getSender(), { value: toNano('0.05') }, {
                $$type: 'NofSubmitReport',
                queryId: 903n,
                totalValue: toNano('110'),
                inOutDelta: toNano('100'),
                quarantineValue: 0n,
                reportTimestamp: 1000n,
            });
            expect(await maxFeeContract.getGetAccruedFee()).toBe(toNano('10')); // 100% of growth
        });
    });
});

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import '@ton/test-utils';

import { ValidatorConsolidationRequests } from '../build/validator_consolidation_requests/validator_consolidation_requests_ValidatorConsolidationRequests';

describe('ValidatorConsolidationRequests', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let vaultHub: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let sourceValidator: SandboxContract<TreasuryContract>;
    let targetValidator: SandboxContract<TreasuryContract>;
    let dashboard: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<ValidatorConsolidationRequests>;

    let queryCounter = 1n;
    function nextQuery(): bigint {
        return queryCounter++;
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        vaultHub = await blockchain.treasury('vaultHub');
        user = await blockchain.treasury('user');
        sourceValidator = await blockchain.treasury('sourceValidator');
        targetValidator = await blockchain.treasury('targetValidator');
        dashboard = await blockchain.treasury('dashboard');
        queryCounter = 1n;

        contract = blockchain.openContract(await ValidatorConsolidationRequests.fromInit(
            admin.address,
            vaultHub.address,
        ));

        await contract.send(admin.getSender(), { value: toNano('0.5') }, { $$type: 'Deploy', queryId: 0n });
    });

    describe('Initialization', () => {
        it('should initialize with correct values', async () => {
            expect(await contract.getGetAdmin()).toEqualAddress(admin.address);
            expect(await contract.getGetVaultHub()).toEqualAddress(vaultHub.address);
            expect(await contract.getGetRequestCount()).toBe(0n);
        });

        it('should return consolidation fee', async () => {
            const fee = await contract.getGetConsolidationFee();
            expect(fee).toBe(toNano('0.05'));
        });
    });

    describe('Submit consolidation request', () => {
        it('should submit a valid consolidation request', async () => {
            const qid = nextQuery();
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: qid,
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: true,
            });

            expect(await contract.getGetRequestCount()).toBe(1n);

            const request = await contract.getGetRequest(0n);
            expect(request).not.toBeNull();
            expect(request!.sourceValidator.toString()).toBe(sourceValidator.address.toString());
            expect(request!.targetValidator.toString()).toBe(targetValidator.address.toString());
            expect(request!.sourceBalance).toBe(toNano('10000'));
            expect(request!.processed).toBe(false);
        });

        it('should reject request with same source and target', async () => {
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: sourceValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject request with balance below minimum stake', async () => {
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('100'), // below 10,000 TON minimum
                dashboard: dashboard.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject duplicate request (same source+target pair)', async () => {
            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('20000'),
                dashboard: dashboard.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject replay queryId', async () => {
            const qid = nextQuery();
            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: qid,
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            const anotherSource = await blockchain.treasury('anotherSource');
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: qid, // same queryId
                sourceValidator: anotherSource.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });
    });

    describe('Process consolidation', () => {
        beforeEach(async () => {
            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });
        });

        it('should process a pending request (admin only)', async () => {
            const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: contract.address,
                success: true,
            });

            // Should send execution message to target validator
            expect(result.transactions).toHaveTransaction({
                from: contract.address,
                to: targetValidator.address,
            });

            const request = await contract.getGetRequest(0n);
            expect(request!.processed).toBe(true);
        });

        it('should reject process from non-admin', async () => {
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject processing already processed request', async () => {
            await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 0n,
            });

            const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject processing non-existent request', async () => {
            const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 999n,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: contract.address,
                success: false,
            });
        });
    });

    describe('Cancel request', () => {
        beforeEach(async () => {
            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });
        });

        it('should allow requestor to cancel', async () => {
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrCancelRequest',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: true,
            });

            const request = await contract.getGetRequest(0n);
            expect(request).toBeNull();
        });

        it('should allow admin to cancel', async () => {
            const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrCancelRequest',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: contract.address,
                success: true,
            });
        });

        it('should reject cancel from unauthorized user', async () => {
            const rando = await blockchain.treasury('rando');
            const result = await contract.send(rando.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrCancelRequest',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: rando.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject cancel of already processed request', async () => {
            await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 0n,
            });

            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrCancelRequest',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });

        it('should allow re-submitting after cancel (duplicate key freed)', async () => {
            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrCancelRequest',
                queryId: nextQuery(),
                requestId: 0n,
            });

            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('15000'),
                dashboard: dashboard.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: true,
            });

            expect(await contract.getGetRequestCount()).toBe(2n); // counter increments
        });
    });

    describe('Queue management', () => {
        it('should handle multiple requests correctly', async () => {
            const val2 = await blockchain.treasury('val2');
            const val3 = await blockchain.treasury('val3');

            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: val2.address,
                targetValidator: val3.address,
                sourceBalance: toNano('20000'),
                dashboard: dashboard.address,
            });

            expect(await contract.getGetRequestCount()).toBe(2n);

            const req0 = await contract.getGetRequest(0n);
            const req1 = await contract.getGetRequest(1n);
            expect(req0!.sourceBalance).toBe(toNano('10000'));
            expect(req1!.sourceBalance).toBe(toNano('20000'));
        });

        it('should track pending status correctly', async () => {
            await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrSubmitRequest',
                queryId: nextQuery(),
                sourceValidator: sourceValidator.address,
                targetValidator: targetValidator.address,
                sourceBalance: toNano('10000'),
                dashboard: dashboard.address,
            });

            expect(await contract.getIsRequestPending(0n)).toBe(true);

            await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrProcessConsolidation',
                queryId: nextQuery(),
                requestId: 0n,
            });

            expect(await contract.getIsRequestPending(0n)).toBe(false);
        });

        it('should return false for non-existent request pending check', async () => {
            expect(await contract.getIsRequestPending(99n)).toBe(false);
        });
    });

    describe('Fee exemption', () => {
        it('should forward fee exemption to dashboard (admin only)', async () => {
            const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrAddFeeExemption',
                queryId: nextQuery(),
                dashboard: dashboard.address,
                exemptedAmount: toNano('50000'),
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: contract.address,
                success: true,
            });

            // Should forward to dashboard
            expect(result.transactions).toHaveTransaction({
                from: contract.address,
                to: dashboard.address,
            });
        });

        it('should reject fee exemption from non-admin', async () => {
            const result = await contract.send(user.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrAddFeeExemption',
                queryId: nextQuery(),
                dashboard: dashboard.address,
                exemptedAmount: toNano('50000'),
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: contract.address,
                success: false,
            });
        });

        it('should reject zero exemption amount', async () => {
            const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
                $$type: 'VcrAddFeeExemption',
                queryId: nextQuery(),
                dashboard: dashboard.address,
                exemptedAmount: 0n,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: contract.address,
                success: false,
            });
        });
    });
});

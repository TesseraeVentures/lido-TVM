import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import '@ton/test-utils';

import { RefSlotCache } from '../build/ref_slot_cache/ref_slot_cache_RefSlotCache';
import { RecoverTokens } from '../build/recover_tokens/recover_tokens_RecoverTokens';
import { MeIfNobodyElse } from '../build/me_if_nobody_else/me_if_nobody_else_MeIfNobodyElse';

describe('RefSlotCache', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<RefSlotCache>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        randomUser = await blockchain.treasury('random');

        contract = blockchain.openContract(await RefSlotCache.fromInit(admin.address));
        await contract.send(admin.getSender(), { value: toNano('0.5') }, { $$type: 'Deploy', queryId: 0n });
    });

    it('should initialize with zero values', async () => {
        expect(await contract.getGetCurrentValue()).toBe(0n);
        expect(await contract.getGetCurrentRefSlot()).toBe(0n);
    });

    it('should increment value on same refSlot', async () => {
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 1n,
            increment: 100n,
            refSlot: 10n,
        });
        expect(await contract.getGetCurrentValue()).toBe(100n);

        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 2n,
            increment: 50n,
            refSlot: 10n,
        });
        expect(await contract.getGetCurrentValue()).toBe(150n);
    });

    it('should cache previous value on new refSlot', async () => {
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 1n,
            increment: 100n,
            refSlot: 10n,
        });

        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 2n,
            increment: 50n,
            refSlot: 20n,
        });

        // Current value should be 150 (100 + 50)
        expect(await contract.getGetCurrentValue()).toBe(150n);

        // Value for refSlot 20 (active) should return valueOnRefSlot = 100
        // Value for refSlot > active should return current
        expect(await contract.getGetValueForRefSlot(30n)).toBe(150n);
    });

    it('should return cached value for previous refSlot', async () => {
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 1n,
            increment: 100n,
            refSlot: 10n,
        });
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 2n,
            increment: 50n,
            refSlot: 20n,
        });

        // For refSlot between prev and active, should return valueOnRefSlot
        const val = await contract.getGetValueForRefSlot(15n);
        expect(val).toBe(100n);
    });

    it('should reject unauthorized increment', async () => {
        const result = await contract.send(randomUser.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 1n,
            increment: 100n,
            refSlot: 10n,
        });
        // Should have bounced
        expect(result.transactions).toHaveTransaction({
            from: randomUser.address,
            to: contract.address,
            success: false,
        });
    });

    it('should reject replay queries', async () => {
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 1n,
            increment: 100n,
            refSlot: 10n,
        });
        const result = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RefSlotIncrement',
            queryId: 1n,
            increment: 50n,
            refSlot: 10n,
        });
        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: contract.address,
            success: false,
        });
    });
});

describe('RecoverTokens', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;
    let recipient: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<RecoverTokens>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        randomUser = await blockchain.treasury('random');
        recipient = await blockchain.treasury('recipient');

        contract = blockchain.openContract(await RecoverTokens.fromInit(admin.address));
        await contract.send(admin.getSender(), { value: toNano('1') }, { $$type: 'Deploy', queryId: 0n });
    });

    it('should initialize with correct admin', async () => {
        expect(await contract.getGetAdmin()).toEqualAddress(admin.address);
    });

    it('should recover TON to recipient', async () => {
        // Send some extra TON to the contract
        await admin.send({ to: contract.address, value: toNano('5'), bounce: false });

        const result = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RecoverTON',
            queryId: 1n,
            recipient: recipient.address,
            amount: toNano('2'),
        });

        expect(result.transactions).toHaveTransaction({
            from: contract.address,
            to: recipient.address,
            value: toNano('2'),
        });
    });

    it('should reject unauthorized TON recovery', async () => {
        const result = await contract.send(randomUser.getSender(), { value: toNano('0.05') }, {
            $$type: 'RecoverTON',
            queryId: 1n,
            recipient: recipient.address,
            amount: toNano('1'),
        });

        expect(result.transactions).toHaveTransaction({
            from: randomUser.address,
            to: contract.address,
            success: false,
        });
    });

    it('should reject replay on recovery', async () => {
        await admin.send({ to: contract.address, value: toNano('5'), bounce: false });

        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RecoverTON',
            queryId: 1n,
            recipient: recipient.address,
            amount: toNano('1'),
        });

        const result = await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'RecoverTON',
            queryId: 1n,
            recipient: recipient.address,
            amount: toNano('1'),
        });

        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: contract.address,
            success: false,
        });
    });

    it('should send jetton transfer message for jetton recovery', async () => {
        const fakeJettonWallet = await blockchain.treasury('jettonWallet');

        const result = await contract.send(admin.getSender(), { value: toNano('0.1') }, {
            $$type: 'RecoverJetton',
            queryId: 2n,
            jettonWallet: fakeJettonWallet.address,
            recipient: recipient.address,
            amount: 1000n,
        });

        // Should have sent a message to the jetton wallet
        expect(result.transactions).toHaveTransaction({
            from: contract.address,
            to: fakeJettonWallet.address,
        });
    });
});

describe('MeIfNobodyElse', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<MeIfNobodyElse>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        randomUser = await blockchain.treasury('random');

        contract = blockchain.openContract(await MeIfNobodyElse.fromInit(admin.address));
        await contract.send(admin.getSender(), { value: toNano('0.5') }, { $$type: 'Deploy', queryId: 0n });
    });

    it('should return key when no value set', async () => {
        const key = admin.address;
        const result = await contract.getGetValueOrKey(key);
        expect(result.toString()).toBe(key.toString());
    });

    it('should return value when set to different address', async () => {
        const key = admin.address;
        const value = randomUser.address;

        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'MineSet',
            queryId: 1n,
            key: key,
            value: value,
        });

        const result = await contract.getGetValueOrKey(key);
        expect(result.toString()).toBe(value.toString());
    });

    it('should reset when value equals key (setOrReset pattern)', async () => {
        const key = admin.address;
        const other = randomUser.address;

        // Set to other
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'MineSet',
            queryId: 1n,
            key: key,
            value: other,
        });
        expect((await contract.getGetValueOrKey(key)).toString()).toBe(other.toString());

        // Set to self (should reset)
        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'MineSet',
            queryId: 2n,
            key: key,
            value: key,
        });
        // Should return key itself now
        expect((await contract.getGetValueOrKey(key)).toString()).toBe(key.toString());
    });

    it('should reset via MineReset message', async () => {
        const key = admin.address;
        const other = randomUser.address;

        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'MineSet',
            queryId: 1n,
            key: key,
            value: other,
        });

        await contract.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'MineReset',
            queryId: 2n,
            key: key,
        });

        expect((await contract.getGetValueOrKey(key)).toString()).toBe(key.toString());
    });

    it('should reject unauthorized set', async () => {
        const result = await contract.send(randomUser.getSender(), { value: toNano('0.05') }, {
            $$type: 'MineSet',
            queryId: 1n,
            key: admin.address,
            value: randomUser.address,
        });

        expect(result.transactions).toHaveTransaction({
            from: randomUser.address,
            to: contract.address,
            success: false,
        });
    });
});

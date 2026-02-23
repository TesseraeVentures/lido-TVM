import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import '@ton/test-utils';

import { Permissions } from '../build/permissions/permissions_Permissions';

const ROLE_DEFAULT_ADMIN = 0;
const ROLE_FUND = 1;
const ROLE_WITHDRAW = 2;
const ROLE_MINT = 3;
const ROLE_PAUSE_DEPOSITS = 6;

describe('Permissions', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;
    let permissions: SandboxContract<Permissions>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        randomUser = await blockchain.treasury('random');

        permissions = blockchain.openContract(await Permissions.fromInit(admin.address));
        await permissions.send(admin.getSender(), { value: toNano('0.05') }, { $$type: 'Deploy', queryId: 0n });
    });

    it('admin has all roles after init', async () => {
        const hasAdmin = await permissions.getHasRole(admin.address, BigInt(ROLE_DEFAULT_ADMIN));
        expect(hasAdmin).toBe(true);
        const hasFund = await permissions.getHasRole(admin.address, BigInt(ROLE_FUND));
        expect(hasFund).toBe(true);
        const hasMint = await permissions.getHasRole(admin.address, BigInt(ROLE_MINT));
        expect(hasMint).toBe(true);
    });

    it('non-admin has no roles', async () => {
        const has = await permissions.getHasRole(randomUser.address, BigInt(ROLE_FUND));
        expect(has).toBe(false);
    });

    it('admin can grant a role', async () => {
        const res = await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 1n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });
        expect(res.transactions).toHaveTransaction({ success: true });

        const has = await permissions.getHasRole(user1.address, BigInt(ROLE_FUND));
        expect(has).toBe(true);

        // Should not have other roles
        const hasWithdraw = await permissions.getHasRole(user1.address, BigInt(ROLE_WITHDRAW));
        expect(hasWithdraw).toBe(false);
    });

    it('admin can revoke a role', async () => {
        // Grant first
        await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 2n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });
        expect(await permissions.getHasRole(user1.address, BigInt(ROLE_FUND))).toBe(true);

        // Revoke
        const res = await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermRevokeRole',
            queryId: 3n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });
        expect(res.transactions).toHaveTransaction({ success: true });
        expect(await permissions.getHasRole(user1.address, BigInt(ROLE_FUND))).toBe(false);
    });

    it('unauthorized user cannot grant roles', async () => {
        const res = await permissions.send(randomUser.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 4n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });
        expect(res.transactions).toHaveTransaction({ success: false, exitCode: 500 });
    });

    it('unauthorized user cannot revoke roles', async () => {
        const res = await permissions.send(randomUser.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermRevokeRole',
            queryId: 5n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });
        expect(res.transactions).toHaveTransaction({ success: false, exitCode: 500 });
    });

    it('renounce role is disabled', async () => {
        const res = await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermRenounceRole',
            queryId: 6n,
            role: BigInt(ROLE_FUND),
        });
        expect(res.transactions).toHaveTransaction({ success: false, exitCode: 503 });
    });

    it('role admin hierarchy - custom admin role', async () => {
        // Set ROLE_PAUSE_DEPOSITS admin to ROLE_FUND
        await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermSetRoleAdmin',
            queryId: 10n,
            role: BigInt(ROLE_PAUSE_DEPOSITS),
            adminRole: BigInt(ROLE_FUND),
        });

        const adminRole = await permissions.getGetRoleAdmin(BigInt(ROLE_PAUSE_DEPOSITS));
        expect(adminRole).toBe(BigInt(ROLE_FUND));

        // Grant FUND role to user1
        await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 11n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });

        // user1 (with FUND role) can now grant PAUSE_DEPOSITS
        const res = await permissions.send(user1.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 12n,
            account: user2.address,
            role: BigInt(ROLE_PAUSE_DEPOSITS),
        });
        expect(res.transactions).toHaveTransaction({ success: true });
        expect(await permissions.getHasRole(user2.address, BigInt(ROLE_PAUSE_DEPOSITS))).toBe(true);
    });

    it('batch grant and revoke roles', async () => {
        // Batch grant FUND + WITHDRAW (bits 1 and 2 = mask 6)
        const mask = BigInt((1 << ROLE_FUND) | (1 << ROLE_WITHDRAW));
        const res = await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermBatchGrantRoles',
            queryId: 20n,
            account: user1.address,
            rolesMask: mask,
        });
        expect(res.transactions).toHaveTransaction({ success: true });
        expect(await permissions.getHasRole(user1.address, BigInt(ROLE_FUND))).toBe(true);
        expect(await permissions.getHasRole(user1.address, BigInt(ROLE_WITHDRAW))).toBe(true);

        // Batch revoke
        const res2 = await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermBatchRevokeRoles',
            queryId: 21n,
            account: user1.address,
            rolesMask: mask,
        });
        expect(res2.transactions).toHaveTransaction({ success: true });
        expect(await permissions.getHasRole(user1.address, BigInt(ROLE_FUND))).toBe(false);
        expect(await permissions.getHasRole(user1.address, BigInt(ROLE_WITHDRAW))).toBe(false);
    });

    it('query replay protection', async () => {
        await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 30n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });

        // Same queryId should fail
        const res = await permissions.send(admin.getSender(), { value: toNano('0.05') }, {
            $$type: 'PermGrantRole',
            queryId: 30n,
            account: user1.address,
            role: BigInt(ROLE_FUND),
        });
        expect(res.transactions).toHaveTransaction({ success: false, exitCode: 505 });
    });

    it('get_roles returns correct bitmask', async () => {
        const roles = await permissions.getGetRoles(admin.address);
        expect(roles).toBe(4095n); // ALL_ROLES_MASK

        const noRoles = await permissions.getGetRoles(randomUser.address);
        expect(noRoles).toBe(0n);
    });

    it('default role admin is DEFAULT_ADMIN', async () => {
        const adminRole = await permissions.getGetRoleAdmin(BigInt(ROLE_FUND));
        expect(adminRole).toBe(BigInt(ROLE_DEFAULT_ADMIN));
    });
});

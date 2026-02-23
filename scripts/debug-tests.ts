import { TonClient, WalletContractV5R1 } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { Address } from '@ton/core';
import { VaultFactory } from '../build/vault_factory/vault_factory_VaultFactory';
import { Permissions } from '../build/permissions/permissions_Permissions';
import * as fs from 'fs';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function retry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    for (let i = 0; i < 10; i++) {
        try { await sleep(3000); return await fn(); }
        catch (e: any) { if (e?.response?.status === 429) { await sleep(5000); } else throw e; }
    }
    throw new Error(`${label}: retries exhausted`);
}

async function main() {
    const addrs = JSON.parse(fs.readFileSync('deploy/testnet-addresses.json', 'utf-8')).contracts;
    const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
    const mnemonic = fs.readFileSync('/root/.lido-testnet-wallet.key', 'utf-8').trim().split('\n')[0].split(' ');
    const kp = await mnemonicToWalletKey(mnemonic);
    const wallet = client.open(WalletContractV5R1.create({ workchain: 0, publicKey: kp.publicKey, walletId: { networkGlobalId: -3, workchain: 0 } as any }));
    const admin = wallet.address;

    console.log('=== DEBUG: deploy-vault ===');
    console.log('Admin:', admin.toString());
    
    // Check what address the factory predicts
    const factory = client.open(VaultFactory.fromAddress(Address.parse(addrs['VaultFactory'])));
    const vaultAddr = await retry(() => factory.getGetVaultAddress(admin, admin, admin), 'vault-addr');
    console.log('Predicted vault address:', vaultAddr.toString());
    
    // Check its state
    const state = await retry(() => client.getContractState(vaultAddr), 'vault-state');
    console.log('Vault state:', state.state);
    
    // Check if any transactions were sent to the factory recently
    const factoryState = await retry(() => client.getContractState(Address.parse(addrs['VaultFactory'])), 'factory-state');
    console.log('Factory state:', factoryState.state);
    console.log('Factory balance:', Number(factoryState.balance) / 1e9, 'TON');
    
    // Check if the vault was created at a DIFFERENT address (maybe it uses a nonce/counter)
    const txs = await retry(() => client.getTransactions(Address.parse(addrs['VaultFactory']), { limit: 5 }), 'factory-txs');
    console.log('Factory recent txs:', txs.length);
    for (const tx of txs) {
        console.log('  tx:', tx.hash().toString('hex').substring(0, 16), 'lt:', tx.lt.toString());
        if (tx.outMessages) {
            const iter = tx.outMessages.values();
            for (const msg of iter) {
                if (msg.info.type === 'internal') {
                    console.log('    out msg to:', msg.info.dest?.toString());
                }
            }
        }
    }

    console.log('\n=== DEBUG: permissions ===');
    const perms = client.open(Permissions.fromAddress(Address.parse(addrs['Permissions'])));
    
    // Try calling hasRole with a simpler role value
    const simpleRole = 1n;
    try {
        const result = await retry(() => perms.getHasRole(admin, simpleRole), 'perm-simple');
        console.log('hasRole(admin, 1):', result);
    } catch (e: any) {
        console.log('hasRole(admin, 1) error:', e.message);
    }
    
    // Try the big role value that failed
    const bigRole = BigInt('0x' + '01'.repeat(32));
    try {
        const result = await retry(() => perms.getHasRole(admin, bigRole), 'perm-big');
        console.log('hasRole(admin, bigRole):', result);
    } catch (e: any) {
        console.log('hasRole(admin, bigRole) error:', e.message);
    }

    // Check what getHasRole expects - look at the generated wrapper
    console.log('\nChecking Permissions contract state...');
    const permState = await retry(() => client.getContractState(Address.parse(addrs['Permissions'])), 'perm-state');
    console.log('Permissions state:', permState.state);
}
main().catch(e => console.error('Fatal:', e.message));

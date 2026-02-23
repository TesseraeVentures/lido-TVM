import { TonClient, WalletContractV5R1 } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { Address } from '@ton/core';
import { VaultFactory } from '../build/vault_factory/vault_factory_VaultFactory';
import * as fs from 'fs';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
async function retry<T>(fn: () => Promise<T>): Promise<T> {
    for (let i = 0; i < 10; i++) {
        try { await sleep(3000); return await fn(); }
        catch (e: any) { if (e?.response?.status === 429) { await sleep(5000); } else throw e; }
    }
    throw new Error('retries exhausted');
}

async function main() {
    const addrs = JSON.parse(fs.readFileSync('deploy/testnet-addresses.json', 'utf-8')).contracts;
    const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
    const mnemonic = fs.readFileSync('/root/.lido-testnet-wallet.key', 'utf-8').trim().split('\n')[0].split(' ');
    const kp = await mnemonicToWalletKey(mnemonic);
    const wallet = client.open(WalletContractV5R1.create({ workchain: 0, publicKey: kp.publicKey, walletId: { networkGlobalId: -3, workchain: 0 } as any }));
    const admin = wallet.address;

    const factory = client.open(VaultFactory.fromAddress(Address.parse(addrs['VaultFactory'])));
    
    // Check vault count
    const count = await retry(() => factory.getGetVaultCount());
    console.log('Vault count:', count);
    
    // Check if vault was already deployed
    const vaultAddr = await retry(() => factory.getGetVaultAddress(admin, admin, admin));
    console.log('Predicted vault addr:', vaultAddr.toString());
    
    const isDeployed = await retry(() => factory.getIsDeployedVault(vaultAddr));
    console.log('Is deployed (in factory map):', isDeployed);
    
    // Check the last queryIds we used
    for (const qid of [300n, 900n]) {
        const processed = await retry(() => factory.getGetQueryProcessed(qid));
        console.log(`Query ${qid} processed:`, processed);
    }
}
main().catch(e => console.error('Fatal:', e.message));

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Dictionary } from '@ton/core';
import '@ton/test-utils';

import { CLProofVerifier } from '../build/cl_proof_verifier/cl_proof_verifier_CLProofVerifier';

/**
 * Helper: build a valid Merkle tree and proof for testing.
 * 
 * We build a small binary tree of depth `depth` with `2^depth` leaves.
 * The leaf at `index` is the target leaf. We return the root and sibling hashes.
 */
function sha256Pair(left: bigint, right: bigint): bigint {
    const b = beginCell().storeUint(left, 256).storeUint(right, 256).endCell();
    return BigInt('0x' + b.hash().toString('hex'));
}

function buildMerkleProof(
    leaves: bigint[],
    targetIndex: number
): { root: bigint; siblings: bigint[]; depth: number } {
    const depth = Math.ceil(Math.log2(leaves.length));
    const size = 1 << depth;

    // Pad leaves to power of 2
    const padded = [...leaves];
    while (padded.length < size) {
        padded.push(0n);
    }

    // Build tree bottom-up
    let layer = padded;
    const siblings: bigint[] = [];
    let idx = targetIndex;

    while (layer.length > 1) {
        const nextLayer: bigint[] = [];
        const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
        siblings.push(layer[siblingIdx]);

        for (let i = 0; i < layer.length; i += 2) {
            nextLayer.push(sha256Pair(layer[i], layer[i + 1]));
        }
        layer = nextLayer;
        idx = Math.floor(idx / 2);
    }

    return { root: layer[0], siblings, depth };
}

describe('CLProofVerifier', () => {
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let oracle: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let verifier: SandboxContract<CLProofVerifier>;

    const FIRST_VALIDATOR_GI = 8n; // gIndex=8, depth=3 (simple example)
    const FIRST_VALIDATOR_DEPTH = 3n;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        oracle = await blockchain.treasury('oracle');
        user = await blockchain.treasury('user');

        verifier = blockchain.openContract(
            await CLProofVerifier.fromInit(
                owner.address,
                oracle.address,
                FIRST_VALIDATOR_GI,
                FIRST_VALIDATOR_DEPTH
            )
        );

        await verifier.send(
            owner.getSender(),
            { value: toNano('0.1') },
            { $$type: 'Deploy', queryId: 0n }
        );
    });

    // ── Admin operations ─────────────────────────────────────

    it('oracle can set state root', async () => {
        const res = await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 1n, slot: 100n, stateRoot: 999n }
        );
        expect(res.transactions).toHaveTransaction({ success: true });

        const root = await verifier.getGetStateRoot(100n);
        expect(root).toEqual(999n);
    });

    it('non-oracle cannot set state root', async () => {
        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 2n, slot: 100n, stateRoot: 999n }
        );
        expect(res.transactions).toHaveTransaction({ success: false });
    });

    it('owner can change oracle', async () => {
        const res = await verifier.send(
            owner.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetOracle', queryId: 3n, oracle: user.address }
        );
        expect(res.transactions).toHaveTransaction({ success: true });
        expect((await verifier.getGetOracle()).toString()).toEqual(user.address.toString());
    });

    it('non-owner cannot change oracle', async () => {
        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetOracle', queryId: 4n, oracle: user.address }
        );
        expect(res.transactions).toHaveTransaction({ success: false });
    });

    it('owner can update first validator GIndex', async () => {
        const res = await verifier.send(
            owner.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetFirstValidatorGIndex', queryId: 5n, gIndex: 16n, depth: 4n }
        );
        expect(res.transactions).toHaveTransaction({ success: true });
        expect(await verifier.getGetFirstValidatorGindex()).toEqual(16n);
        expect(await verifier.getGetFirstValidatorDepth()).toEqual(4n);
    });

    it('rejects replay queries', async () => {
        await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 10n, slot: 1n, stateRoot: 1n }
        );
        const res = await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 10n, slot: 2n, stateRoot: 2n }
        );
        expect(res.transactions).toHaveTransaction({ success: false });
    });

    // ── Proof verification ───────────────────────────────────

    it('valid proof verification succeeds', async () => {
        // Build a small Merkle tree
        const pubkeyHash = 0xABCDn;
        const wc = 0x1234n;
        const leafHash = sha256Pair(pubkeyHash, wc);

        // 4 leaves, target at index 1
        const leaves = [sha256Pair(0x1111n, 0x2222n), leafHash, sha256Pair(0x3333n, 0x4444n), sha256Pair(0x5555n, 0x6666n)];
        const targetIndex = 1;
        const { root, siblings, depth } = buildMerkleProof(leaves, targetIndex);

        // Set state root
        await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 20n, slot: 200n, stateRoot: root }
        );

        // Build proof branch map
        const proofBranch = Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        for (let i = 0; i < siblings.length; i++) {
            proofBranch.set(BigInt(i), siblings[i]);
        }

        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'VerifyValidator',
                queryId: 21n,
                pubkeyHash: pubkeyHash,
                withdrawalCredentials: wc,
                validatorIndex: BigInt(targetIndex),
                slot: 200n,
                proofBranch: proofBranch,
                proofLength: BigInt(depth)
            }
        );
        expect(res.transactions).toHaveTransaction({ success: true });
        // Should have a VerifyResult message back to user
        expect(res.transactions).toHaveTransaction({
            from: verifier.address,
            to: user.address,
            success: true
        });
    });

    it('invalid proof is rejected', async () => {
        const pubkeyHash = 0xABCDn;
        const wc = 0x1234n;
        const leafHash = sha256Pair(pubkeyHash, wc);

        const leaves = [sha256Pair(0x1111n, 0x2222n), leafHash, sha256Pair(0x3333n, 0x4444n), sha256Pair(0x5555n, 0x6666n)];
        const { root, siblings, depth } = buildMerkleProof(leaves, 1);

        await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 30n, slot: 300n, stateRoot: root }
        );

        // Tamper with a sibling
        const badBranch = Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        for (let i = 0; i < siblings.length; i++) {
            badBranch.set(BigInt(i), siblings[i] + 1n); // corrupt
        }

        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'VerifyValidator',
                queryId: 31n,
                pubkeyHash: pubkeyHash,
                withdrawalCredentials: wc,
                validatorIndex: 1n,
                slot: 300n,
                proofBranch: badBranch,
                proofLength: BigInt(depth)
            }
        );
        expect(res.transactions).toHaveTransaction({ success: false });
    });

    it('rejects proof for unknown slot', async () => {
        const proofBranch = Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        proofBranch.set(0n, 123n);

        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'VerifyValidator',
                queryId: 40n,
                pubkeyHash: 1n,
                withdrawalCredentials: 2n,
                validatorIndex: 0n,
                slot: 999n,
                proofBranch: proofBranch,
                proofLength: 1n
            }
        );
        expect(res.transactions).toHaveTransaction({ success: false });
    });

    it('wrong validator index fails verification', async () => {
        const pubkeyHash = 0xABCDn;
        const wc = 0x1234n;
        const leafHash = sha256Pair(pubkeyHash, wc);

        const leaves = [sha256Pair(0x1111n, 0x2222n), leafHash, sha256Pair(0x3333n, 0x4444n), sha256Pair(0x5555n, 0x6666n)];
        const targetIndex = 1;
        const { root, siblings, depth } = buildMerkleProof(leaves, targetIndex);

        await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 50n, slot: 500n, stateRoot: root }
        );

        const proofBranch = Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        for (let i = 0; i < siblings.length; i++) {
            proofBranch.set(BigInt(i), siblings[i]);
        }

        // Use wrong validator index (0 instead of 1)
        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'VerifyValidator',
                queryId: 51n,
                pubkeyHash: pubkeyHash,
                withdrawalCredentials: wc,
                validatorIndex: 0n, // WRONG
                slot: 500n,
                proofBranch: proofBranch,
                proofLength: BigInt(depth)
            }
        );
        expect(res.transactions).toHaveTransaction({ success: false });
    });

    it('single-leaf tree (depth=0) with proof length 0 verifies leaf==root', async () => {
        const pubkeyHash = 0x42n;
        const wc = 0x43n;
        const leafHash = sha256Pair(pubkeyHash, wc);

        // Root IS the leaf
        await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 60n, slot: 600n, stateRoot: leafHash }
        );

        const emptyBranch = Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));

        const res = await verifier.send(
            user.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'VerifyValidator',
                queryId: 61n,
                pubkeyHash: pubkeyHash,
                withdrawalCredentials: wc,
                validatorIndex: 0n,
                slot: 600n,
                proofBranch: emptyBranch,
                proofLength: 0n
            }
        );
        expect(res.transactions).toHaveTransaction({ success: true });
    });

    // ── Getter tests ─────────────────────────────────────────

    it('compute_leaf_hash getter works', async () => {
        const pubkeyHash = 0xABCDn;
        const wc = 0x1234n;
        const expected = sha256Pair(pubkeyHash, wc);
        const result = await verifier.getComputeLeafHash(pubkeyHash, wc);
        expect(result).toEqual(expected);
    });

    it('verify_proof getter returns false for missing root', async () => {
        const emptyBranch = Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        const result = await verifier.getVerifyProof(1n, 2n, 0n, 999n, emptyBranch, 0n);
        expect(result).toBe(false);
    });

    it('query_processed getter tracks state', async () => {
        expect(await verifier.getGetQueryProcessed(1n)).toBe(false);
        await verifier.send(
            oracle.getSender(),
            { value: toNano('0.05') },
            { $$type: 'SetStateRoot', queryId: 1n, slot: 1n, stateRoot: 1n }
        );
        expect(await verifier.getGetQueryProcessed(1n)).toBe(true);
    });
});

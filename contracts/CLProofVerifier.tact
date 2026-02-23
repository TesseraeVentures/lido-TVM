import "@stdlib/deploy";

// ============================================================
// CLProofVerifier — TON/TVM adaptation of Lido's CLProofVerifier
// ============================================================
// On EVM, this verifies Merkle proofs of validators against beacon
// chain state roots (EIP-4788). On TON, there's no beacon chain.
//
// This contract adapts the concept: it verifies SHA256-based Merkle
// proofs of validator state (pubkey + withdrawal credentials) against
// a trusted state root. The trusted root is set by an authorized
// oracle (e.g., LazyOracle or a bridge relay).
//
// Proof structure (adapted from EVM's concatenated proof):
//   - proofData: Cell containing the Merkle sibling hashes
//   - leaf: hash of (pubkeyHash, withdrawalCredentials)
//   - gIndex: generalized index encoding path through the tree
//   - root: trusted state root to verify against
// ============================================================

const OP_VERIFY_VALIDATOR: Int = 0x56505246;    // 'VPRF'
const OP_SET_STATE_ROOT: Int = 0x53535254;      // 'SSRT'
const OP_SET_ORACLE: Int = 0x534F5243;          // 'SORC'
const OP_SET_FIRST_VALIDATOR_GI: Int = 0x53465649; // 'SFVI'

const E_UNAUTHORIZED: Int = 100;
const E_INVALID_ARG: Int = 102;
const E_INVALID_PROOF: Int = 110;
const E_ROOT_NOT_FOUND: Int = 111;
const E_INVALID_SLOT: Int = 112;
const E_REPLAY: Int = 109;

// ── Messages ──────────────────────────────────────────────────

message(0x53535254) SetStateRoot {
    queryId: Int as uint64;
    slot: Int as uint64;
    stateRoot: Int as uint256;
}

message(0x534F5243) SetOracle {
    queryId: Int as uint64;
    oracle: Address;
}

message(0x53465649) SetFirstValidatorGIndex {
    queryId: Int as uint64;
    gIndex: Int as uint64;
    depth: Int as uint8;
}

message(0x56505246) VerifyValidator {
    queryId: Int as uint64;
    pubkeyHash: Int as uint256;
    withdrawalCredentials: Int as uint256;
    validatorIndex: Int as uint64;
    slot: Int as uint64;
    proofBranch: map<Int, Int>;  // index → sibling hash (uint256)
    proofLength: Int as uint8;
}

message(0x56524553) VerifyResult {
    queryId: Int as uint64;
    valid: Bool;
    validatorIndex: Int as uint64;
    pubkeyHash: Int as uint256;
}

// ── Contract ──────────────────────────────────────────────────

contract CLProofVerifier with Deployable {
    owner: Address;
    oracle: Address;

    // GIndex parameters for first validator in the state tree
    firstValidatorGIndex: Int as uint64;
    firstValidatorDepth: Int as uint8;

    // Trusted state roots keyed by slot
    stateRoots: map<Int, Int>;    // slot → stateRoot (uint256)

    // Replay protection
    processedQueries: map<Int, Bool>;

    init(owner: Address, oracle: Address, firstValidatorGIndex: Int, firstValidatorDepth: Int) {
        self.owner = owner;
        self.oracle = oracle;
        self.firstValidatorGIndex = firstValidatorGIndex;
        self.firstValidatorDepth = firstValidatorDepth;
        self.stateRoots = emptyMap();
        self.processedQueries = emptyMap();
    }

    // Oracle sets trusted state roots
    receive(msg: SetStateRoot) {
        require(sender() == self.oracle, "Unauthorized");
        self.consumeQuery(msg.queryId);
        require(msg.stateRoot > 0, "Invalid root");
        self.stateRoots.set(msg.slot, msg.stateRoot);
    }

    // Owner sets oracle address
    receive(msg: SetOracle) {
        require(sender() == self.owner, "Unauthorized");
        self.consumeQuery(msg.queryId);
        self.oracle = msg.oracle;
    }

    // Owner updates first validator GIndex (for hardfork transitions)
    receive(msg: SetFirstValidatorGIndex) {
        require(sender() == self.owner, "Unauthorized");
        self.consumeQuery(msg.queryId);
        require(msg.gIndex > 0, "Invalid gIndex");
        require(msg.depth > 0, "Invalid depth");
        self.firstValidatorGIndex = msg.gIndex;
        self.firstValidatorDepth = msg.depth;
    }

    // Verify a validator's proof and send result back to caller
    receive(msg: VerifyValidator) {
        self.consumeQuery(msg.queryId);

        let root: Int? = self.stateRoots.get(msg.slot);
        require(root != null, "Root not found");

        // Compute leaf: sha256(pubkeyHash || withdrawalCredentials)
        // In the EVM version this is BLS12_381.sha256Pair(pubkeyRoot, wc)
        let leafBuilder: Builder = beginCell();
        leafBuilder = leafBuilder.storeUint(msg.pubkeyHash, 256);
        leafBuilder = leafBuilder.storeUint(msg.withdrawalCredentials, 256);
        let leafHash: Int = leafBuilder.asSlice().hash();

        // Compute the generalized index for this validator
        // gIndex = firstValidatorGIndex + validatorIndex (shifted in tree)
        // Then we prepend the pubkey/wc parent depth (depth=2, position=0)
        // Total path = stateRoot path + validator offset + parent node
        // The proof must cover this full path

        let valid: Bool = self.verifyMerkleProof(
            leafHash,
            root!!,
            msg.proofBranch,
            msg.proofLength,
            msg.validatorIndex
        );

        require(valid, "Invalid proof");

        // Send verification result back to caller
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: 64, // carry remaining value
            body: VerifyResult{
                queryId: msg.queryId,
                valid: true,
                validatorIndex: msg.validatorIndex,
                pubkeyHash: msg.pubkeyHash
            }.toCell()
        });
    }

    // ── Getters ──────────────────────────────────────────────

    get fun get_owner(): Address { return self.owner; }
    get fun get_oracle(): Address { return self.oracle; }
    get fun get_first_validator_gindex(): Int { return self.firstValidatorGIndex; }
    get fun get_first_validator_depth(): Int { return self.firstValidatorDepth; }

    get fun get_state_root(slot: Int): Int? {
        return self.stateRoots.get(slot);
    }

    get fun get_query_processed(queryId: Int): Bool {
        let seen: Bool? = self.processedQueries.get(queryId);
        return seen != null;
    }

    // Off-chain verification helper: compute leaf hash
    get fun compute_leaf_hash(pubkeyHash: Int, withdrawalCredentials: Int): Int {
        let b: Builder = beginCell();
        b = b.storeUint(pubkeyHash, 256);
        b = b.storeUint(withdrawalCredentials, 256);
        return b.asSlice().hash();
    }

    // Verify proof off-chain via getter
    get fun verify_proof(
        pubkeyHash: Int,
        withdrawalCredentials: Int,
        validatorIndex: Int,
        slot: Int,
        proofBranch: map<Int, Int>,
        proofLength: Int
    ): Bool {
        let root: Int? = self.stateRoots.get(slot);
        if (root == null) {
            return false;
        }
        let b: Builder = beginCell();
        b = b.storeUint(pubkeyHash, 256);
        b = b.storeUint(withdrawalCredentials, 256);
        let leafHash: Int = b.asSlice().hash();
        return self.verifyMerkleProof(leafHash, root!!, proofBranch, proofLength, validatorIndex);
    }

    // ── Internal ─────────────────────────────────────────────

    fun verifyMerkleProof(
        leaf: Int,
        root: Int,
        proofBranch: map<Int, Int>,
        proofLength: Int,
        validatorIndex: Int
    ): Bool {
        // Walk up the tree: at each level, combine current hash with sibling
        // Direction determined by the generalized index bits
        // Full gIndex = (firstValidatorGIndex + validatorIndex) with pubkey/wc parent appended
        // But we simplify: the proof branch already encodes the path,
        // and validatorIndex determines left/right at each level

        let current: Int = leaf;
        let pathBits: Int = validatorIndex;
        let i: Int = 0;

        while (i < proofLength) {
            let sibling: Int? = proofBranch.get(i);
            if (sibling == null) {
                return false;
            }

            let pairBuilder: Builder = beginCell();
            if (pathBits % 2 == 0) {
                // Current node is left child
                pairBuilder = pairBuilder.storeUint(current, 256);
                pairBuilder = pairBuilder.storeUint(sibling!!, 256);
            } else {
                // Current node is right child
                pairBuilder = pairBuilder.storeUint(sibling!!, 256);
                pairBuilder = pairBuilder.storeUint(current, 256);
            }
            current = pairBuilder.asSlice().hash();
            pathBits = pathBits / 2;
            i = i + 1;
        }

        return current == root;
    }

    fun consumeQuery(queryId: Int) {
        require(queryId > 0, "Invalid queryId");
        let seen: Bool? = self.processedQueries.get(queryId);
        require(seen == null, "Replay");
        self.processedQueries.set(queryId, true);
    }
}

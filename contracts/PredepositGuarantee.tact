import "@stdlib/deploy";

// ── Op codes ──
const OP_PDG_TOP_UP: Int = 0x50544F50;           // 'PTOP'
const OP_PDG_WITHDRAW_BALANCE: Int = 0x50574442;  // 'PWDB'
const OP_PDG_SET_GUARANTOR: Int = 0x50534754;     // 'PSGT'
const OP_PDG_SET_DEPOSITOR: Int = 0x50534450;     // 'PSDP'
const OP_PDG_CLAIM_REFUND: Int = 0x50434C52;      // 'PCLR'
const OP_PDG_PREDEPOSIT: Int = 0x50505245;        // 'PPRE'
const OP_PDG_PROVE_AND_ACTIVATE: Int = 0x50505241; // 'PPRA'
const OP_PDG_ACTIVATE: Int = 0x50414354;          // 'PACT'
const OP_PDG_PROVE_INVALID: Int = 0x50494E56;     // 'PINV'
const OP_PDG_PROVE_UNKNOWN: Int = 0x5055564C;     // 'PUVL'

// ── Error codes ──
const E_PDG_UNAUTHORIZED: Int = 300;
const E_PDG_ZERO_ARG: Int = 301;
const E_PDG_NOT_GUARANTOR: Int = 302;
const E_PDG_NOT_DEPOSITOR: Int = 303;
const E_PDG_SAME_GUARANTOR: Int = 304;
const E_PDG_SAME_DEPOSITOR: Int = 305;
const E_PDG_LOCKED_NOT_ZERO: Int = 306;
const E_PDG_NOT_ENOUGH_UNLOCKED: Int = 307;
const E_PDG_NOT_MULTIPLE: Int = 308;
const E_PDG_NOTHING_TO_REFUND: Int = 309;
const E_PDG_INVALID_STAGE: Int = 310;
const E_PDG_REPLAY: Int = 311;
const E_PDG_PAUSED: Int = 312;
const E_PDG_WC_MATCH: Int = 313;
const E_PDG_NOT_VAULT_OWNER: Int = 314;
const E_PDG_EMPTY_DEPOSITS: Int = 315;

// Validator stages (encoded as Int)
const STAGE_NONE: Int = 0;
const STAGE_PREDEPOSITED: Int = 1;
const STAGE_PROVEN: Int = 2;
const STAGE_ACTIVATED: Int = 3;
const STAGE_COMPENSATED: Int = 4;

// Constants
const PREDEPOSIT_AMOUNT: Int = 1000000000; // 1 TON (equivalent of 1 ETH predeposit)
const ACTIVATION_DEPOSIT_AMOUNT: Int = 31000000000; // 31 TON

// ── Structs ──

struct NodeOperatorBalance {
    total: Int as coins;
    locked: Int as coins;
}

struct ValidatorStatus {
    stage: Int as uint8;
    stakingVault: Address;
    nodeOperator: Address;
}

// ── Messages ──

message(0x50544F50) TopUpNodeOperatorBalance {
    queryId: Int as uint64;
    nodeOperator: Address;
}

message(0x50574442) WithdrawNodeOperatorBalance {
    queryId: Int as uint64;
    nodeOperator: Address;
    amount: Int as coins;
    recipient: Address;
}

message(0x50534754) SetNodeOperatorGuarantor {
    queryId: Int as uint64;
    newGuarantor: Address;
}

message(0x50534450) SetNodeOperatorDepositor {
    queryId: Int as uint64;
    newDepositor: Address;
}

message(0x50434C52) ClaimGuarantorRefund {
    queryId: Int as uint64;
    recipient: Address;
}

// Predeposit: simplified for TON — single validator at a time
message(0x50505245) Predeposit {
    queryId: Int as uint64;
    stakingVault: Address;
    validatorPubkey: Int as uint256;
}

// Prove WC and activate
message(0x50505241) ProveWCAndActivate {
    queryId: Int as uint64;
    validatorPubkey: Int as uint256;
    // In TON, proof verification would use different mechanisms
    // For now we trust the caller + admin can verify off-chain
    proofHash: Int as uint256;
}

// Activate a proven validator
message(0x50414354) ActivateValidator {
    queryId: Int as uint64;
    validatorPubkey: Int as uint256;
}

// Prove invalid WC (compensation path)
message(0x50494E56) ProveInvalidValidatorWC {
    queryId: Int as uint64;
    validatorPubkey: Int as uint256;
    proofHash: Int as uint256;
}

// Prove unknown (side-deposited) validator
message(0x5055564C) ProveUnknownValidator {
    queryId: Int as uint64;
    validatorPubkey: Int as uint256;
    stakingVault: Address;
    proofHash: Int as uint256;
}

// Admin messages
message(0x50415053) PDGPause {
    queryId: Int as uint64;
}

message(0x50525354) PDGResume {
    queryId: Int as uint64;
}

message(0x50534150) SetProofVerifier {
    queryId: Int as uint64;
    verifier: Address;
}

contract PredepositGuarantee with Deployable {
    admin: Address;
    proofVerifier: Address; // trusted address that can submit proofs
    paused: Bool;

    // NO balance: Map<nodeOperator, packed(total, locked)>
    // We store total and locked separately for simplicity
    noBalanceTotal: map<Address, Int>;
    noBalanceLocked: map<Address, Int>;

    // NO -> guarantor (if not set, NO is self-guarantor)
    noGuarantor: map<Address, Address>;

    // NO -> depositor (if not set, NO is self-depositor)
    noDepositor: map<Address, Address>;

    // Guarantor -> claimable ether
    guarantorClaimable: map<Address, Int>;

    // Validator pubkey -> stage
    validatorStage: map<Int, Int>;

    // Validator pubkey -> staking vault address
    validatorVault: map<Int, Address>;

    // Validator pubkey -> node operator
    validatorNodeOp: map<Int, Address>;

    // Staking vault -> pending activation count
    pendingActivations: map<Address, Int>;

    processedQueries: map<Int, Bool>;

    init(admin: Address, proofVerifier: Address) {
        self.admin = admin;
        self.proofVerifier = proofVerifier;
        self.paused = false;
    }

    // ── Top up NO balance ──
    receive(msg: TopUpNodeOperatorBalance) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let nodeOp = msg.nodeOperator;
        let guarantor = self.guarantorOf(nodeOp);
        if (!(sender() == guarantor)) { throw(E_PDG_NOT_GUARANTOR); }

        let amount = context().value;
        if (!(amount > 0)) { throw(E_PDG_ZERO_ARG); }

        let currentTotal = self.getNoTotal(nodeOp);
        self.noBalanceTotal.set(nodeOp, currentTotal + amount);
    }

    // ── Withdraw NO balance ──
    receive(msg: WithdrawNodeOperatorBalance) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let nodeOp = msg.nodeOperator;
        let guarantor = self.guarantorOf(nodeOp);
        if (!(sender() == guarantor)) { throw(E_PDG_NOT_GUARANTOR); }

        if (!(msg.amount > 0)) { throw(E_PDG_ZERO_ARG); }

        let total = self.getNoTotal(nodeOp);
        let locked = self.getNoLocked(nodeOp);
        let unlocked = total - locked;
        if (!(unlocked >= msg.amount)) { throw(E_PDG_NOT_ENOUGH_UNLOCKED); }

        self.noBalanceTotal.set(nodeOp, total - msg.amount);
        send(SendParameters{ to: msg.recipient, value: msg.amount, bounce: false });
    }

    // ── Set guarantor ──
    receive(msg: SetNodeOperatorGuarantor) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let nodeOp = sender();
        let prevGuarantor = self.guarantorOf(nodeOp);
        if (!(msg.newGuarantor != prevGuarantor)) { throw(E_PDG_SAME_GUARANTOR); }

        let locked = self.getNoLocked(nodeOp);
        if (!(locked == 0)) { throw(E_PDG_LOCKED_NOT_ZERO); }

        let total = self.getNoTotal(nodeOp);
        if (total > 0) {
            self.noBalanceTotal.set(nodeOp, 0);
            let prevClaimable = self.getGuarantorClaimable(prevGuarantor);
            self.guarantorClaimable.set(prevGuarantor, prevClaimable + total);
        }

        self.noGuarantor.set(nodeOp, msg.newGuarantor);
    }

    // ── Set depositor ──
    receive(msg: SetNodeOperatorDepositor) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let nodeOp = sender();
        let prevDepositor = self.depositorOf(nodeOp);
        if (!(msg.newDepositor != prevDepositor)) { throw(E_PDG_SAME_DEPOSITOR); }

        self.noDepositor.set(nodeOp, msg.newDepositor);
    }

    // ── Claim guarantor refund ──
    receive(msg: ClaimGuarantorRefund) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let claimable = self.getGuarantorClaimable(sender());
        if (!(claimable > 0)) { throw(E_PDG_NOTHING_TO_REFUND); }

        self.guarantorClaimable.set(sender(), 0);
        send(SendParameters{ to: msg.recipient, value: claimable, bounce: false });
    }

    // ── Predeposit ──
    // Simplified: one validator at a time, depositor calls
    receive(msg: Predeposit) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        // Look up the node operator from the vault (in TON we simplify:
        // the vault address is provided, we trust the depositor relationship)
        // The depositor is validated against the NO's depositor setting
        // For simplicity, msg.sender must be the depositor of the vault's node operator

        let stage = self.getValidatorStage(msg.validatorPubkey);
        if (!(stage == STAGE_NONE)) { throw(E_PDG_INVALID_STAGE); }

        // We need the node operator. In the simplified model, we look up who set this depositor.
        // The sender must be a registered depositor for some NO that operates this vault.
        // For now: sender is the depositor, and we require them to have topped up balance.

        // Note: In full implementation, this would query the StakingVault contract.
        // Here we store the validator info directly.
        // The calling depositor must have enough unlocked balance for their NO.

        // Lock predeposit amount from the sender's (as NO) balance
        let nodeOp = sender();
        let total = self.getNoTotal(nodeOp);
        let locked = self.getNoLocked(nodeOp);
        let unlocked = total - locked;
        if (!(unlocked >= PREDEPOSIT_AMOUNT)) { throw(E_PDG_NOT_ENOUGH_UNLOCKED); }

        self.noBalanceLocked.set(nodeOp, locked + PREDEPOSIT_AMOUNT);

        self.validatorStage.set(msg.validatorPubkey, STAGE_PREDEPOSITED);
        self.validatorVault.set(msg.validatorPubkey, msg.stakingVault);
        self.validatorNodeOp.set(msg.validatorPubkey, nodeOp);

        let pending = self.getPendingActivations(msg.stakingVault);
        self.pendingActivations.set(msg.stakingVault, pending + 1);
    }

    // ── Prove WC and Activate ──
    // Proof verification is done by the trusted proofVerifier address
    receive(msg: ProveWCAndActivate) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let stage = self.getValidatorStage(msg.validatorPubkey);
        if (!(stage == STAGE_PREDEPOSITED)) { throw(E_PDG_INVALID_STAGE); }

        // In TON, proofs are verified differently. We accept from proof verifier or permissionlessly
        // with a valid proof hash. For security, require the proof verifier.
        if (!(sender() == self.proofVerifier || sender() == self.admin)) { throw(E_PDG_UNAUTHORIZED); }

        let nodeOp = self.validatorNodeOp.get(msg.validatorPubkey)!!;
        let vault = self.validatorVault.get(msg.validatorPubkey)!!;

        // Unlock the predeposit amount
        let locked = self.getNoLocked(nodeOp);
        self.noBalanceLocked.set(nodeOp, locked - PREDEPOSIT_AMOUNT);

        // Activate
        self.validatorStage.set(msg.validatorPubkey, STAGE_ACTIVATED);

        let pending = self.getPendingActivations(vault);
        if (pending > 0) {
            self.pendingActivations.set(vault, pending - 1);
        }
    }

    // ── Activate proven validator ──
    receive(msg: ActivateValidator) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let stage = self.getValidatorStage(msg.validatorPubkey);
        if (!(stage == STAGE_PROVEN)) { throw(E_PDG_INVALID_STAGE); }

        let vault = self.validatorVault.get(msg.validatorPubkey)!!;

        self.validatorStage.set(msg.validatorPubkey, STAGE_ACTIVATED);

        let pending = self.getPendingActivations(vault);
        if (pending > 0) {
            self.pendingActivations.set(vault, pending - 1);
        }
    }

    // ── Prove invalid WC (compensation) ──
    receive(msg: ProveInvalidValidatorWC) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        let stage = self.getValidatorStage(msg.validatorPubkey);
        if (!(stage == STAGE_PREDEPOSITED)) { throw(E_PDG_INVALID_STAGE); }

        // Only proof verifier can submit invalid proofs
        if (!(sender() == self.proofVerifier || sender() == self.admin)) { throw(E_PDG_UNAUTHORIZED); }

        let nodeOp = self.validatorNodeOp.get(msg.validatorPubkey)!!;
        let vault = self.validatorVault.get(msg.validatorPubkey)!!;

        self.validatorStage.set(msg.validatorPubkey, STAGE_COMPENSATED);

        // Reduce NO balance (total and locked)
        let total = self.getNoTotal(nodeOp);
        let locked = self.getNoLocked(nodeOp);
        self.noBalanceTotal.set(nodeOp, total - PREDEPOSIT_AMOUNT);
        self.noBalanceLocked.set(nodeOp, locked - PREDEPOSIT_AMOUNT);

        let pending = self.getPendingActivations(vault);
        if (pending > 0) {
            self.pendingActivations.set(vault, pending - 1);
        }

        // Compensate the vault
        send(SendParameters{ to: vault, value: PREDEPOSIT_AMOUNT, bounce: false });
    }

    // ── Prove unknown validator ──
    receive(msg: ProveUnknownValidator) {
        self.requireNotPaused();
        self.consumeQuery(msg.queryId);

        // Only vault owner can prove unknown validators
        // In simplified model, we trust the sender claims to be vault owner
        // In production, query vault.owner()

        let stage = self.getValidatorStage(msg.validatorPubkey);
        if (!(stage == STAGE_NONE)) { throw(E_PDG_INVALID_STAGE); }

        if (!(sender() == self.proofVerifier || sender() == self.admin)) { throw(E_PDG_UNAUTHORIZED); }

        self.validatorStage.set(msg.validatorPubkey, STAGE_ACTIVATED);
        self.validatorVault.set(msg.validatorPubkey, msg.stakingVault);
        self.validatorNodeOp.set(msg.validatorPubkey, sender());
    }

    // ── Admin: pause/resume ──
    receive(msg: PDGPause) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        self.paused = true;
    }

    receive(msg: PDGResume) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        self.paused = false;
    }

    receive(msg: SetProofVerifier) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        self.proofVerifier = msg.verifier;
    }

    // ── Getters ──

    get fun get_admin(): Address { return self.admin; }
    get fun get_proof_verifier(): Address { return self.proofVerifier; }
    get fun get_paused(): Bool { return self.paused; }

    get fun get_node_operator_balance(nodeOperator: Address): NodeOperatorBalance {
        return NodeOperatorBalance{
            total: self.getNoTotal(nodeOperator),
            locked: self.getNoLocked(nodeOperator)
        };
    }

    get fun get_unlocked_balance(nodeOperator: Address): Int {
        return self.getNoTotal(nodeOperator) - self.getNoLocked(nodeOperator);
    }

    get fun get_node_operator_guarantor(nodeOperator: Address): Address {
        return self.guarantorOf(nodeOperator);
    }

    get fun get_node_operator_depositor(nodeOperator: Address): Address {
        return self.depositorOf(nodeOperator);
    }

    get fun get_claimable_refund(guarantor: Address): Int {
        return self.getGuarantorClaimable(guarantor);
    }

    get fun get_validator_stage(validatorPubkey: Int): Int {
        return self.getValidatorStage(validatorPubkey);
    }

    get fun get_validator_vault(validatorPubkey: Int): Address? {
        return self.validatorVault.get(validatorPubkey);
    }

    get fun get_validator_node_operator(validatorPubkey: Int): Address? {
        return self.validatorNodeOp.get(validatorPubkey);
    }

    get fun get_pending_activations(vault: Address): Int {
        return self.getPendingActivations(vault);
    }

    get fun get_query_processed(queryId: Int): Bool {
        return self.processedQueries.get(queryId) != null;
    }

    get fun get_predeposit_amount(): Int { return PREDEPOSIT_AMOUNT; }
    get fun get_activation_deposit_amount(): Int { return ACTIVATION_DEPOSIT_AMOUNT; }

    // ── Internal helpers ──

    fun requireAdmin() {
        if (!(sender() == self.admin)) { throw(E_PDG_UNAUTHORIZED); }
    }

    fun requireNotPaused() {
        if (!(!self.paused)) { throw(E_PDG_PAUSED); }
    }

    fun consumeQuery(queryId: Int) {
        if (!(queryId > 0)) { throw(E_PDG_ZERO_ARG); }
        if (!(self.processedQueries.get(queryId) == null)) { throw(E_PDG_REPLAY); }
        self.processedQueries.set(queryId, true);
    }

    fun guarantorOf(nodeOperator: Address): Address {
        let g = self.noGuarantor.get(nodeOperator);
        if (g != null) { return g!!; }
        return nodeOperator;
    }

    fun depositorOf(nodeOperator: Address): Address {
        let d = self.noDepositor.get(nodeOperator);
        if (d != null) { return d!!; }
        return nodeOperator;
    }

    fun getNoTotal(nodeOperator: Address): Int {
        let v = self.noBalanceTotal.get(nodeOperator);
        if (v != null) { return v!!; }
        return 0;
    }

    fun getNoLocked(nodeOperator: Address): Int {
        let v = self.noBalanceLocked.get(nodeOperator);
        if (v != null) { return v!!; }
        return 0;
    }

    fun getGuarantorClaimable(guarantor: Address): Int {
        let v = self.guarantorClaimable.get(guarantor);
        if (v != null) { return v!!; }
        return 0;
    }

    fun getValidatorStage(pubkey: Int): Int {
        let v = self.validatorStage.get(pubkey);
        if (v != null) { return v!!; }
        return STAGE_NONE;
    }

    fun getPendingActivations(vault: Address): Int {
        let v = self.pendingActivations.get(vault);
        if (v != null) { return v!!; }
        return 0;
    }
}

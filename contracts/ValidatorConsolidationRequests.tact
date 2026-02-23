import "@stdlib/deploy";

// ── Error codes ──
const E_VCR_UNAUTHORIZED: Int = 800;
const E_VCR_REPLAY: Int = 801;
const E_VCR_ZERO_ADDRESS: Int = 802;
const E_VCR_MISMATCHED_LENGTHS: Int = 803;
const E_VCR_EMPTY_REQUEST: Int = 804;
const E_VCR_VAULT_NOT_CONNECTED: Int = 805;
const E_VCR_INVALID_BALANCES: Int = 806;
const E_VCR_REQUEST_NOT_FOUND: Int = 807;
const E_VCR_ALREADY_PROCESSED: Int = 808;
const E_VCR_DUPLICATE_REQUEST: Int = 809;
const E_VCR_INVALID_VALIDATOR: Int = 810;

const MINIMUM_VALIDATOR_STAKE: Int = 10000000000000; // 10,000 TON in nanotons

// ── Structs ──

struct ConsolidationRequest {
    sourceValidator: Address;
    targetValidator: Address;
    sourceBalance: Int as coins;
    requestor: Address;
    timestamp: Int as uint48;
    processed: Bool;
}

// ── Messages ──

message(0x56435253) VcrSubmitRequest {
    queryId: Int as uint64;
    sourceValidator: Address;
    targetValidator: Address;
    sourceBalance: Int as coins;
    dashboard: Address;
}

message(0x56435250) VcrProcessConsolidation {
    queryId: Int as uint64;
    requestId: Int as uint32;
}

message(0x56435243) VcrCancelRequest {
    queryId: Int as uint64;
    requestId: Int as uint32;
}

message(0x56435246) VcrAddFeeExemption {
    queryId: Int as uint64;
    dashboard: Address;
    exemptedAmount: Int as coins;
}

// Message sent to NodeOperatorFee for fee exemption
message(0x4E464558) NofAddFeeExemptionFwd {
    queryId: Int as uint64;
    exemptedAmount: Int as coins;
}

// Message sent to target vault for consolidation execution
message(0x56435845) VcrExecuteConsolidation {
    queryId: Int as uint64;
    sourceValidator: Address;
    targetValidator: Address;
    amount: Int as coins;
}

contract ValidatorConsolidationRequests with Deployable {
    admin: Address;
    vaultHub: Address;
    
    requestCount: Int as uint32;
    requests: map<Int, ConsolidationRequest>;
    
    // Track source→target to prevent duplicates (using hash as key)
    requestKeyUsed: map<Int, Bool>;
    
    processedQueries: map<Int, Bool>;

    init(admin: Address, vaultHub: Address) {
        self.admin = admin;
        self.vaultHub = vaultHub;
        self.requestCount = 0;
    }

    // ── Submit a consolidation request ──
    receive(msg: VcrSubmitRequest) {
        self.consumeQuery(msg.queryId);
        
        // Validate inputs
        require(msg.sourceValidator != msg.targetValidator, "Same source and target");
        require(msg.sourceBalance >= MINIMUM_VALIDATOR_STAKE, "Balance below minimum stake");
        
        // Check for duplicate using hash of source+target
        let key = self.requestKey(msg.sourceValidator, msg.targetValidator);
        if (self.requestKeyUsed.get(key) != null) {
            throw(E_VCR_DUPLICATE_REQUEST);
        }
        
        let requestId = self.requestCount;
        let request = ConsolidationRequest{
            sourceValidator: msg.sourceValidator,
            targetValidator: msg.targetValidator,
            sourceBalance: msg.sourceBalance,
            requestor: sender(),
            timestamp: now(),
            processed: false
        };
        
        self.requests.set(requestId, request);
        self.requestKeyUsed.set(key, true);
        self.requestCount = requestId + 1;
    }

    // ── Process (execute) a consolidation request ──
    receive(msg: VcrProcessConsolidation) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        
        let existing = self.requests.get(msg.requestId);
        if (existing == null) {
            throw(E_VCR_REQUEST_NOT_FOUND);
        }
        let request = existing!!;
        
        if (request.processed) {
            throw(E_VCR_ALREADY_PROCESSED);
        }
        
        // Mark as processed
        let updated = ConsolidationRequest{
            sourceValidator: request.sourceValidator,
            targetValidator: request.targetValidator,
            sourceBalance: request.sourceBalance,
            requestor: request.requestor,
            timestamp: request.timestamp,
            processed: true
        };
        self.requests.set(msg.requestId, updated);
        
        // Send execution message to target validator (staking vault)
        send(SendParameters{
            to: request.targetValidator,
            value: ton("0.05"),
            bounce: true,
            body: VcrExecuteConsolidation{
                queryId: msg.queryId,
                sourceValidator: request.sourceValidator,
                targetValidator: request.targetValidator,
                amount: request.sourceBalance
            }.toCell()
        });
    }

    // ── Cancel a pending request ──
    receive(msg: VcrCancelRequest) {
        self.consumeQuery(msg.queryId);
        
        let existing = self.requests.get(msg.requestId);
        if (existing == null) {
            throw(E_VCR_REQUEST_NOT_FOUND);
        }
        let request = existing!!;
        
        if (request.processed) {
            throw(E_VCR_ALREADY_PROCESSED);
        }
        
        // Only requestor or admin can cancel
        let s = sender();
        require(s == request.requestor || s == self.admin, "Unauthorized cancel");
        
        // Remove the duplicate key tracking
        let key = self.requestKey(request.sourceValidator, request.targetValidator);
        self.requestKeyUsed.set(key, null);
        
        // Remove the request
        self.requests.set(msg.requestId, null);
    }

    // ── Submit fee exemption for consolidated balances ──
    receive(msg: VcrAddFeeExemption) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        require(msg.exemptedAmount > 0, "Zero exemption");
        
        // Forward fee exemption to the dashboard's NodeOperatorFee contract
        send(SendParameters{
            to: msg.dashboard,
            value: ton("0.05"),
            bounce: true,
            body: NofAddFeeExemptionFwd{
                queryId: msg.queryId,
                exemptedAmount: msg.exemptedAmount
            }.toCell()
        });
    }

    // ── Bounce handler for failed execution ──
    bounced(msg: bounced<VcrExecuteConsolidation>) {
        // Execution failed — mark request as unprocessed so it can be retried
        // We need to find the request by matching source+target
        // Since we can't iterate maps efficiently, we leave the request as-is
        // The admin can resubmit
    }

    // ── Getters ──

    get fun get_admin(): Address { return self.admin; }
    get fun get_vault_hub(): Address { return self.vaultHub; }
    get fun get_request_count(): Int { return self.requestCount; }

    get fun get_request(requestId: Int): ConsolidationRequest? {
        return self.requests.get(requestId);
    }

    get fun get_query_processed(queryId: Int): Bool {
        return self.processedQueries.get(queryId) != null;
    }

    get fun get_consolidation_fee(): Int {
        // On TON, consolidation fee is a flat gas fee
        return ton("0.05");
    }

    get fun is_request_pending(requestId: Int): Bool {
        let existing = self.requests.get(requestId);
        if (existing == null) { return false; }
        return !existing!!.processed;
    }

    // ── Internal ──

    fun requestKey(source: Address, target: Address): Int {
        // Create a unique key from two addresses by hashing
        let b = beginCell();
        b = b.storeAddress(source);
        b = b.storeAddress(target);
        return b.endCell().hash();
    }

    fun requireAdmin() {
        if (sender() != self.admin) {
            throw(E_VCR_UNAUTHORIZED);
        }
    }

    fun consumeQuery(queryId: Int) {
        require(queryId > 0, "Invalid queryId");
        if (self.processedQueries.get(queryId) != null) {
            throw(E_VCR_REPLAY);
        }
        self.processedQueries.set(queryId, true);
    }
}

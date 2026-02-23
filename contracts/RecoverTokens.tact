import "@stdlib/deploy";

// ── Error codes ──
const E_RECOVER_UNAUTHORIZED: Int = 710;
const E_RECOVER_REPLAY: Int = 711;
const E_RECOVER_TRANSFER_FAILED: Int = 712;
const E_RECOVER_ZERO_AMOUNT: Int = 713;

// ── Messages ──

message(0x52435645) RecoverTON {
    queryId: Int as uint64;
    recipient: Address;
    amount: Int as coins;
}

message(0x52434A54) RecoverJetton {
    queryId: Int as uint64;
    jettonWallet: Address;
    recipient: Address;
    amount: Int as coins;
}

// Jetton transfer message (standard TEP-74)
message(0x0f8a7ea5) JettonTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

contract RecoverTokens with Deployable {
    admin: Address;
    processedQueries: map<Int, Bool>;

    init(admin: Address) {
        self.admin = admin;
    }

    // Recover native TON
    receive(msg: RecoverTON) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        require(msg.amount > 0, "Zero amount");

        send(SendParameters{
            to: msg.recipient,
            value: msg.amount,
            mode: SendPayGasSeparately,
            bounce: true,
            body: emptyCell()
        });
    }

    // Recover Jettons via standard transfer
    receive(msg: RecoverJetton) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        require(msg.amount > 0, "Zero amount");

        send(SendParameters{
            to: msg.jettonWallet,
            value: ton("0.05"),
            mode: SendPayGasSeparately,
            bounce: true,
            body: JettonTransfer{
                queryId: msg.queryId,
                amount: msg.amount,
                destination: msg.recipient,
                responseDestination: self.admin,
                customPayload: null,
                forwardTonAmount: 0,
                forwardPayload: emptySlice()
            }.toCell()
        });
    }

    // ── Getters ──

    get fun get_admin(): Address { return self.admin; }

    // ── Internal ──

    fun requireAdmin() {
        if (sender() != self.admin) { throw(E_RECOVER_UNAUTHORIZED); }
    }

    fun consumeQuery(queryId: Int) {
        if (queryId == 0) { throw(E_RECOVER_REPLAY); }
        if (self.processedQueries.get(queryId) != null) { throw(E_RECOVER_REPLAY); }
        self.processedQueries.set(queryId, true);
    }
}

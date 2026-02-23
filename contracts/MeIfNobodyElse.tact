import "@stdlib/deploy";

// ── Error codes ──
const E_MINE_UNAUTHORIZED: Int = 720;
const E_MINE_REPLAY: Int = 721;

// ── Messages ──

message(0x4D494E53) MineSet {
    queryId: Int as uint64;
    key: Address;
    value: Address;
}

message(0x4D494E52) MineReset {
    queryId: Int as uint64;
    key: Address;
}

contract MeIfNobodyElse with Deployable {
    admin: Address;
    entries: map<Address, Address>;
    processedQueries: map<Int, Bool>;

    init(admin: Address) {
        self.admin = admin;
    }

    // Set value for key; if value == key, stores nothing (reset)
    receive(msg: MineSet) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);

        if (msg.key == msg.value) {
            self.entries.set(msg.key, null);
        } else {
            self.entries.set(msg.key, msg.value);
        }
    }

    // Explicitly reset a key
    receive(msg: MineReset) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        self.entries.set(msg.key, null);
    }

    // ── Getters ──

    get fun get_admin(): Address { return self.admin; }

    // Returns the value for key, or key itself if not set
    get fun get_value_or_key(key: Address): Address {
        let value: Address? = self.entries.get(key);
        if (value == null) {
            return key;
        }
        return value!!;
    }

    // ── Internal ──

    fun requireAdmin() {
        if (sender() != self.admin) { throw(E_MINE_UNAUTHORIZED); }
    }

    fun consumeQuery(queryId: Int) {
        if (queryId == 0) { throw(E_MINE_REPLAY); }
        if (self.processedQueries.get(queryId) != null) { throw(E_MINE_REPLAY); }
        self.processedQueries.set(queryId, true);
    }
}

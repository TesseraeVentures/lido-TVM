import "@stdlib/deploy";

// ── Error codes ──
const E_REFSLOT_UNAUTHORIZED: Int = 700;
const E_REFSLOT_REPLAY: Int = 701;
const E_REFSLOT_CACHE_OVERWRITTEN: Int = 702;

// ── Messages ──

message(0x52534956) RefSlotIncrement {
    queryId: Int as uint64;
    increment: Int as int257;
    refSlot: Int as uint48;
}

message(0x52534756) RefSlotGetValue {
    queryId: Int as uint64;
    refSlot: Int as uint48;
}

message(0x52535352) RefSlotSetRefSlot {
    queryId: Int as uint64;
    refSlot: Int as uint48;
}

// ── Structs ──

struct CacheEntry {
    value: Int;
    valueOnRefSlot: Int;
    refSlot: Int as uint48;
}

contract RefSlotCache with Deployable {
    admin: Address;

    // Double cache (two entries) for the Int104WithCache pattern
    cache0: CacheEntry;
    cache1: CacheEntry;

    currentRefSlot: Int as uint48;
    processedQueries: map<Int, Bool>;

    init(admin: Address) {
        self.admin = admin;
        self.cache0 = CacheEntry{ value: 0, valueOnRefSlot: 0, refSlot: 0 };
        self.cache1 = CacheEntry{ value: 0, valueOnRefSlot: 0, refSlot: 0 };
        self.currentRefSlot = 0;
    }

    receive(msg: RefSlotIncrement) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);

        let refSlot: Int = msg.refSlot;
        let activeIdx: Int = self._activeCacheIndex();

        if (activeIdx == 0) {
            if (self.cache0.refSlot != refSlot) {
                // Rotate: copy current to slot 1
                self.cache1 = CacheEntry{
                    value: self.cache0.value,
                    valueOnRefSlot: self.cache0.value,
                    refSlot: refSlot
                };
                self.cache1 = CacheEntry{
                    value: self.cache0.value + msg.increment,
                    valueOnRefSlot: self.cache0.value,
                    refSlot: refSlot
                };
                // slot 1 is now active (higher refSlot)
            } else {
                self.cache0 = CacheEntry{
                    value: self.cache0.value + msg.increment,
                    valueOnRefSlot: self.cache0.valueOnRefSlot,
                    refSlot: self.cache0.refSlot
                };
            }
        } else {
            if (self.cache1.refSlot != refSlot) {
                // Rotate: copy current to slot 0
                self.cache0 = CacheEntry{
                    value: self.cache1.value + msg.increment,
                    valueOnRefSlot: self.cache1.value,
                    refSlot: refSlot
                };
                // slot 0 is now active (higher refSlot)
            } else {
                self.cache1 = CacheEntry{
                    value: self.cache1.value + msg.increment,
                    valueOnRefSlot: self.cache1.valueOnRefSlot,
                    refSlot: self.cache1.refSlot
                };
            }
        }

        self.currentRefSlot = refSlot;
    }

    receive(msg: RefSlotSetRefSlot) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        self.currentRefSlot = msg.refSlot;
    }

    // ── Getters ──

    get fun get_admin(): Address { return self.admin; }
    get fun get_current_ref_slot(): Int { return self.currentRefSlot; }

    get fun get_current_value(): Int {
        let idx: Int = self._activeCacheIndex();
        if (idx == 0) { return self.cache0.value; }
        return self.cache1.value;
    }

    get fun get_value_for_ref_slot(refSlot: Int): Int {
        let activeIdx: Int = self._activeCacheIndex();
        let active: CacheEntry = activeIdx == 0 ? self.cache0 : self.cache1;
        let previous: CacheEntry = activeIdx == 0 ? self.cache1 : self.cache0;

        // refSlot is more recent than active
        if (refSlot > active.refSlot) {
            return active.value;
        }

        // refSlot is in (prevRefSlot, activeRefSlot]
        if (refSlot > previous.refSlot) {
            return active.valueOnRefSlot;
        }

        // refSlot equals previous
        if (refSlot == previous.refSlot) {
            return previous.valueOnRefSlot;
        }

        // Cache overwritten
        return -1; // sentinel for overwritten
    }

    get fun get_cache0(): CacheEntry { return self.cache0; }
    get fun get_cache1(): CacheEntry { return self.cache1; }

    // ── Internal ──

    fun _activeCacheIndex(): Int {
        if (self.cache0.refSlot >= self.cache1.refSlot) { return 0; }
        return 1;
    }

    fun requireAdmin() {
        if (sender() != self.admin) { throw(E_REFSLOT_UNAUTHORIZED); }
    }

    fun consumeQuery(queryId: Int) {
        if (queryId == 0) { throw(E_REFSLOT_REPLAY); }
        if (self.processedQueries.get(queryId) != null) { throw(E_REFSLOT_REPLAY); }
        self.processedQueries.set(queryId, true);
    }
}

import "@stdlib/deploy";

// ── Error codes ──
const E_PERM_UNAUTHORIZED: Int = 500;
const E_PERM_ZERO_ADDRESS: Int = 501;
const E_PERM_ALREADY_INITIALIZED: Int = 502;
const E_PERM_RENOUNCE_DISABLED: Int = 503;
const E_PERM_ZERO_ARGUMENT: Int = 504;
const E_PERM_REPLAY: Int = 505;

// ── Role constants (bit positions) ──
const ROLE_DEFAULT_ADMIN: Int = 0;
const ROLE_FUND: Int = 1;
const ROLE_WITHDRAW: Int = 2;
const ROLE_MINT: Int = 3;
const ROLE_BURN: Int = 4;
const ROLE_REBALANCE: Int = 5;
const ROLE_PAUSE_DEPOSITS: Int = 6;
const ROLE_RESUME_DEPOSITS: Int = 7;
const ROLE_REQUEST_VALIDATOR_EXIT: Int = 8;
const ROLE_TRIGGER_VALIDATOR_WITHDRAWAL: Int = 9;
const ROLE_VOLUNTARY_DISCONNECT: Int = 10;
const ROLE_VAULT_CONFIGURATION: Int = 11;

// All roles bitmask (bits 0-11)
const ALL_ROLES_MASK: Int = 4095; // (1 << 12) - 1

// ── Messages ──

message(0x50475254) PermGrantRole {
    queryId: Int as uint64;
    account: Address;
    role: Int as uint8;
}

message(0x50525652) PermRevokeRole {
    queryId: Int as uint64;
    account: Address;
    role: Int as uint8;
}

message(0x50524E52) PermRenounceRole {
    queryId: Int as uint64;
    role: Int as uint8;
}

message(0x50534144) PermSetRoleAdmin {
    queryId: Int as uint64;
    role: Int as uint8;
    adminRole: Int as uint8;
}

message(0x50424752) PermBatchGrantRoles {
    queryId: Int as uint64;
    account: Address;
    rolesMask: Int as uint16;
}

message(0x50425252) PermBatchRevokeRoles {
    queryId: Int as uint64;
    account: Address;
    rolesMask: Int as uint16;
}

contract Permissions with Deployable {
    admin: Address;

    // address -> bitmask of granted roles
    roleMembers: map<Address, Int>;

    // role (bit position) -> admin role (bit position)
    // Default: ROLE_DEFAULT_ADMIN (0) is admin for all roles
    roleAdmins: map<Int, Int>;

    processedQueries: map<Int, Bool>;

    init(admin: Address) {
        self.admin = admin;
        // Grant admin all roles
        self.roleMembers.set(admin, ALL_ROLES_MASK);
    }

    // ── Grant a single role ──
    receive(msg: PermGrantRole) {
        self.consumeQuery(msg.queryId);
        self.requireRoleAdmin(sender(), msg.role);

        let current = self._getRoleBits(msg.account);
        self.roleMembers.set(msg.account, current | (1 << msg.role));
    }

    // ── Revoke a single role ──
    receive(msg: PermRevokeRole) {
        self.consumeQuery(msg.queryId);
        self.requireRoleAdmin(sender(), msg.role);

        let current = self._getRoleBits(msg.account);
        self.roleMembers.set(msg.account, current & ~(1 << msg.role));
    }

    // ── Renounce role (disabled per Lido spec) ──
    receive(msg: PermRenounceRole) {
        throw(E_PERM_RENOUNCE_DISABLED);
    }

    // ── Set role admin ──
    receive(msg: PermSetRoleAdmin) {
        self.consumeQuery(msg.queryId);
        self.requireRole(sender(), ROLE_DEFAULT_ADMIN);
        self.roleAdmins.set(msg.role, msg.adminRole);
    }

    // ── Batch grant roles ──
    receive(msg: PermBatchGrantRoles) {
        self.consumeQuery(msg.queryId);
        self.requireRole(sender(), ROLE_DEFAULT_ADMIN);

        let current = self._getRoleBits(msg.account);
        self.roleMembers.set(msg.account, current | msg.rolesMask);
    }

    // ── Batch revoke roles ──
    receive(msg: PermBatchRevokeRoles) {
        self.consumeQuery(msg.queryId);
        self.requireRole(sender(), ROLE_DEFAULT_ADMIN);

        let current = self._getRoleBits(msg.account);
        self.roleMembers.set(msg.account, current & ~msg.rolesMask);
    }

    // ── Getters ──

    get fun has_role(account: Address, role: Int): Bool {
        let bits = self.roleMembers.get(account);
        if (bits == null) { return false; }
        return (bits!! & (1 << role)) != 0;
    }

    get fun get_role_admin(role: Int): Int {
        let admin = self.roleAdmins.get(role);
        if (admin == null) { return ROLE_DEFAULT_ADMIN; }
        return admin!!;
    }

    get fun get_roles(account: Address): Int {
        return self._getRoleBits(account);
    }

    get fun get_admin(): Address {
        return self.admin;
    }

    // ── Internal helpers ──

    fun _getRoleBits(account: Address): Int {
        let bits = self.roleMembers.get(account);
        if (bits == null) { return 0; }
        return bits!!;
    }

    fun requireRole(account: Address, role: Int) {
        let bits = self.roleMembers.get(account);
        if (bits == null) { throw(E_PERM_UNAUTHORIZED); }
        if ((bits!! & (1 << role)) == 0) { throw(E_PERM_UNAUTHORIZED); }
    }

    fun requireRoleAdmin(account: Address, role: Int) {
        let adminRole = self.get_role_admin(role);
        // Check if sender has the admin role OR the role itself (onlyRoleMemberOrAdmin pattern)
        let bits = self._getRoleBits(account);
        if ((bits & (1 << adminRole)) == 0) {
            throw(E_PERM_UNAUTHORIZED);
        }
    }

    fun consumeQuery(queryId: Int) {
        if (queryId == 0) { throw(E_PERM_ZERO_ARGUMENT); }
        if (self.processedQueries.get(queryId) != null) { throw(E_PERM_REPLAY); }
        self.processedQueries.set(queryId, true);
    }
}

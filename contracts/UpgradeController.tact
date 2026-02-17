import "@stdlib/deploy";

const E_UNAUTHORIZED: Int = 100;
const E_OSSIFIED: Int = 106;

message(0x50525550) ProposeUpgrade {
    queryId: Int as uint64;
    vault: Address;
    codeHash: Int as uint256;
}

message(0x41555047) AuthorizeUpgrade {
    queryId: Int as uint64;
    codeHash: Int as uint256;
}

contract UpgradeController with Deployable {
    governance: Address;
    ossified: Bool;

    init(governance: Address) {
        self.governance = governance;
        self.ossified = false;
    }

    receive(msg: ProposeUpgrade) {
        if (!(sender() == self.governance)) { throw(E_UNAUTHORIZED); }
        if (!(!self.ossified)) { throw(E_OSSIFIED); }

        send(SendParameters {
            to: msg.vault,
            value: ton("0.02"),
            bounce: true,
            body: AuthorizeUpgrade { queryId: msg.queryId, codeHash: msg.codeHash }.toCell()
        });
    }

    receive(msg: String) {
        if (!(sender() == self.governance)) { throw(E_UNAUTHORIZED); }
        if (msg == "ossify") {
            self.ossified = true;
            return;
        }
    }

    get fun get_governance(): Address { return self.governance; }
    get fun get_ossified(): Bool { return self.ossified; }
}

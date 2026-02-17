import "@stdlib/deploy";

message(0x41545057) AdapterTriggerWithdrawal {
    queryId: Int as uint64;
    validatorsCount: Int as uint16;
}

contract WithdrawalAdapterStub with Deployable {
    lastQueryId: Int as uint64;
    lastValidatorsCount: Int as uint16;

    init() {
        self.lastQueryId = 0;
        self.lastValidatorsCount = 0;
    }

    receive(msg: AdapterTriggerWithdrawal) {
        self.lastQueryId = msg.queryId;
        self.lastValidatorsCount = msg.validatorsCount;
    }

    get fun get_last_query_id(): Int { return self.lastQueryId; }
    get fun get_last_validators_count(): Int { return self.lastValidatorsCount; }
}

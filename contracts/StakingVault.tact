import "@stdlib/deploy";

const OP_FUND: Int = 0x46554E44; // 'FUND'
const OP_WITHDRAW: Int = 0x57445448; // 'WDTH'
const OP_SET_DEPOSITOR: Int = 0x53444550; // 'SDEP'
const OP_PAUSE_DEPOSITS: Int = 0x50415553; // 'PAUS'
const OP_RESUME_DEPOSITS: Int = 0x5245534D; // 'RESM'
const OP_DEPOSIT_TO_BEACON: Int = 0x44425053; // 'DBPS'
const OP_REQUEST_EXIT: Int = 0x52455854; // 'REXT'
const OP_TRIGGER_WITHDRAWAL: Int = 0x54525744; // 'TRWD'
const OP_OSSIFY: Int = 0x4F535346; // 'OSSF'
const OP_AUTH_UPGRADE: Int = 0x41555047; // 'AUPG'

const E_UNAUTHORIZED: Int = 100;
const E_ZERO_VALUE: Int = 101;
const E_INVALID_ARG: Int = 102;
const E_PAUSED: Int = 103;
const E_ALREADY_PAUSED: Int = 104;
const E_ALREADY_RESUMED: Int = 105;
const E_OSSIFIED: Int = 106;
const E_INSUFFICIENT_FEE: Int = 107;
const E_UPGRADE_NOT_AUTHORIZED: Int = 108;

message(0x53465452) SetFee {
    queryId: Int as uint64;
    perValidatorFee: Int as coins;
}

message(0x464E4456) Fund {
    queryId: Int as uint64;
}

message(0x57445448) Withdraw {
    queryId: Int as uint64;
    recipient: Address;
    amount: Int as coins;
}

message(0x53444550) SetDepositor {
    queryId: Int as uint64;
    depositor: Address;
}

message(0x50415553) PauseBeaconDeposits {
    queryId: Int as uint64;
}

message(0x5245534D) ResumeBeaconDeposits {
    queryId: Int as uint64;
}

message(0x44425053) DepositToBeacon {
    queryId: Int as uint64;
    validatorsCount: Int as uint16;
    totalAmount: Int as coins;
}

message(0x52455854) RequestValidatorExit {
    queryId: Int as uint64;
    validatorsCount: Int as uint16;
}

message(0x54525744) TriggerValidatorWithdrawal {
    queryId: Int as uint64;
    validatorsCount: Int as uint16;
    refundRecipient: Address;
}

message(0x41545057) AdapterTriggerWithdrawal {
    queryId: Int as uint64;
    validatorsCount: Int as uint16;
}

message(0x41555047) AuthorizeUpgrade {
    queryId: Int as uint64;
    codeHash: Int as uint256;
}

contract StakingVault with Deployable {
    owner: Address;
    nodeOperator: Address;
    depositor: Address;
    upgradeController: Address;
    withdrawalAdapter: Address;

    beaconChainDepositsPaused: Bool;
    ossified: Bool;
    version: Int as uint16;

    withdrawalFeePerValidator: Int as coins;
    pendingQueryId: Int as uint64;
    pendingFee: Int as coins;
    pendingRefundRecipient: Address;

    activeCodeHash: Int as uint256;

    init(owner: Address, nodeOperator: Address, depositor: Address, upgradeController: Address, withdrawalAdapter: Address) {
        self.owner = owner;
        self.nodeOperator = nodeOperator;
        self.depositor = depositor;
        self.upgradeController = upgradeController;
        self.withdrawalAdapter = withdrawalAdapter;

        self.beaconChainDepositsPaused = false;
        self.ossified = false;
        self.version = 1;

        self.withdrawalFeePerValidator = ton("0.01");
        self.pendingQueryId = 0;
        self.pendingFee = 0;
        self.pendingRefundRecipient = owner;
        self.activeCodeHash = 0;
    }

    receive(msg: SetFee) {
        self.requireOwner();
        if (!(msg.perValidatorFee > 0)) { throw(E_ZERO_VALUE); }
        self.withdrawalFeePerValidator = msg.perValidatorFee;
    }

    receive(msg: Fund) {
        self.requireOwner();
        if (!(context().value > 0)) { throw(E_ZERO_VALUE); }
    }

    receive(msg: Withdraw) {
        self.requireOwner();
        if (!(msg.amount > 0)) { throw(E_ZERO_VALUE); }
        send(SendParameters{to: msg.recipient, value: msg.amount, bounce: false});
    }

    receive(msg: SetDepositor) {
        self.requireOwner();
        self.depositor = msg.depositor;
    }

    receive(msg: PauseBeaconDeposits) {
        self.requireOwner();
        if (!(!self.beaconChainDepositsPaused)) { throw(E_ALREADY_PAUSED); }
        self.beaconChainDepositsPaused = true;
    }

    receive(msg: ResumeBeaconDeposits) {
        self.requireOwner();
        if (!(self.beaconChainDepositsPaused)) { throw(E_ALREADY_RESUMED); }
        self.beaconChainDepositsPaused = false;
    }

    receive(msg: DepositToBeacon) {
        if (!(sender() == self.depositor)) { throw(E_UNAUTHORIZED); }
        if (!(!self.beaconChainDepositsPaused)) { throw(E_PAUSED); }
        if (!(msg.validatorsCount > 0)) { throw(E_INVALID_ARG); }
        if (!(msg.totalAmount > 0)) { throw(E_ZERO_VALUE); }
    }

    receive(msg: RequestValidatorExit) {
        self.requireOwner();
        if (!(msg.validatorsCount > 0)) { throw(E_INVALID_ARG); }
    }

    receive(msg: TriggerValidatorWithdrawal) {
        self.requireOwner();
        if (!(msg.validatorsCount > 0)) { throw(E_INVALID_ARG); }

        let requiredFee = self.withdrawalFeePerValidator * msg.validatorsCount;
        if (!(context().value >= requiredFee)) { throw(E_INSUFFICIENT_FEE); }

        self.pendingQueryId = msg.queryId;
        self.pendingFee = requiredFee;
        self.pendingRefundRecipient = msg.refundRecipient;

        send(SendParameters {
            to: self.withdrawalAdapter,
            value: requiredFee,
            bounce: true,
            body: AdapterTriggerWithdrawal { queryId: msg.queryId, validatorsCount: msg.validatorsCount }.toCell()
        });

        let excess = context().value - requiredFee;
        if (excess > 0) {
            send(SendParameters { to: msg.refundRecipient, value: excess, bounce: false });
        }

    }

    bounced(msg: AdapterTriggerWithdrawal) {
        if (self.pendingQueryId == msg.queryId && self.pendingFee > 0) {
            send(SendParameters{to: self.pendingRefundRecipient, value: self.pendingFee, bounce: false});
            self.pendingFee = 0;
            self.pendingQueryId = 0;
        }
    }

    receive(msg: AuthorizeUpgrade) {
        if (!(sender() == self.upgradeController)) { throw(E_UNAUTHORIZED); }
        if (!(!self.ossified)) { throw(E_OSSIFIED); }
        self.activeCodeHash = msg.codeHash;
    }

    receive(msg: String) {
        self.requireOwner();
        if (msg == "ossify") {
            if (!(!self.ossified)) { throw(E_OSSIFIED); }
            self.ossified = true;
            return;
        }
        throw(E_INVALID_ARG);
    }

    get fun get_owner(): Address { return self.owner; }
    get fun get_node_operator(): Address { return self.nodeOperator; }
    get fun get_depositor(): Address { return self.depositor; }
    get fun get_paused(): Bool { return self.beaconChainDepositsPaused; }
    get fun get_ossified(): Bool { return self.ossified; }
    get fun get_withdrawal_fee_per_validator(): Int { return self.withdrawalFeePerValidator; }
    get fun get_active_code_hash(): Int { return self.activeCodeHash; }
    get fun get_pending_query_id(): Int { return self.pendingQueryId; }
    get fun get_pending_fee(): Int { return self.pendingFee; }

    get fun calculate_validator_withdrawal_fee(keysCount: Int): Int {
        if (!(keysCount > 0)) { throw(E_INVALID_ARG); }
        return keysCount * self.withdrawalFeePerValidator;
    }

    fun requireOwner() {
        if (!(sender() == self.owner)) { throw(E_UNAUTHORIZED); }
    }
}

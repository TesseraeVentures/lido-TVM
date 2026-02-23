import "@stdlib/deploy";

// ── Error codes ──
const E_NOF_UNAUTHORIZED: Int = 700;
const E_NOF_REPLAY: Int = 701;
const E_NOF_FEE_EXCEEDS_100: Int = 702;
const E_NOF_ABNORMALLY_HIGH_FEE: Int = 703;
const E_NOF_SAME_RECIPIENT: Int = 704;
const E_NOF_SAME_SETTLED_GROWTH: Int = 705;
const E_NOF_REPORT_STALE: Int = 706;
const E_NOF_CORRECTION_AFTER_REPORT: Int = 707;
const E_NOF_UNEXPECTED_SETTLED_GROWTH: Int = 708;
const E_NOF_UNEXPECTED_EXEMPTION_AMOUNT: Int = 709;
const E_NOF_ZERO_ADDRESS: Int = 710;
const E_NOF_ZERO_FEE: Int = 711;

const NOF_TOTAL_BASIS_POINTS: Int = 10000;
const ABNORMALLY_HIGH_FEE_THRESHOLD_BP: Int = 100; // 1%
const MAX_SANE_SETTLED_GROWTH: Int = 618970019642690137449562111; // 2^89 - 1, analogous to int104.max

// ── Messages ──

message(0x4E464453) NofDisburseFee {
    queryId: Int as uint64;
}

message(0x4E464148) NofDisburseAbnormallyHighFee {
    queryId: Int as uint64;
}

message(0x4E465352) NofSetFeeRate {
    queryId: Int as uint64;
    newFeeRate: Int as uint16;
}

message(0x4E464353) NofCorrectSettledGrowth {
    queryId: Int as uint64;
    newSettledGrowth: Int;
    expectedSettledGrowth: Int;
}

message(0x4E464558) NofAddFeeExemption {
    queryId: Int as uint64;
    exemptedAmount: Int as coins;
}

message(0x4E465243) NofSetFeeRecipient {
    queryId: Int as uint64;
    newFeeRecipient: Address;
}

message(0x4E465250) NofSubmitReport {
    queryId: Int as uint64;
    totalValue: Int as coins;
    inOutDelta: Int;
    quarantineValue: Int as coins;
    reportTimestamp: Int as uint48;
}

// ── Structs ──

struct FeeCalcResult {
    fee: Int;
    growth: Int;
    abnormallyHighFeeThreshold: Int;
}

contract NodeOperatorFee with Deployable {
    admin: Address;
    nodeOperatorManager: Address;
    feeExemptRole: Address;        // address with fee exempt permission
    feeRecipient: Address;
    feeRate: Int as uint16;
    settledGrowth: Int;
    latestCorrectionTimestamp: Int as uint64;

    // Simplified report storage (in Solidity this came from VaultHub/LazyOracle)
    lastReportTotalValue: Int as coins;
    lastReportInOutDelta: Int;
    lastReportQuarantineValue: Int as coins;
    lastReportTimestamp: Int as uint48;
    reportFresh: Bool;

    processedQueries: map<Int, Bool>;

    init(
        admin: Address,
        nodeOperatorManager: Address,
        feeExemptRole: Address,
        feeRecipient: Address,
        feeRate: Int
    ) {
        require(feeRate <= NOF_TOTAL_BASIS_POINTS, "Fee exceeds 100%");
        self.admin = admin;
        self.nodeOperatorManager = nodeOperatorManager;
        self.feeExemptRole = feeExemptRole;
        self.feeRecipient = feeRecipient;
        self.feeRate = feeRate;
        self.settledGrowth = 0;
        self.latestCorrectionTimestamp = 0;
        self.lastReportTotalValue = 0;
        self.lastReportInOutDelta = 0;
        self.lastReportQuarantineValue = 0;
        self.lastReportTimestamp = 0;
        self.reportFresh = false;
    }

    // ── Receive report from oracle/hub (simulates VaultHub.latestReport + LazyOracle) ──
    receive(msg: NofSubmitReport) {
        self.requireAdminOrManager();
        self.consumeQuery(msg.queryId);
        self.lastReportTotalValue = msg.totalValue;
        self.lastReportInOutDelta = msg.inOutDelta;
        self.lastReportQuarantineValue = msg.quarantineValue;
        self.lastReportTimestamp = msg.reportTimestamp;
        self.reportFresh = true;
    }

    // ── Disburse fee (permissionless, but rejects abnormally high) ──
    receive(msg: NofDisburseFee) {
        self.consumeQuery(msg.queryId);
        let calc = self.calculateFee();
        if (calc.fee > calc.abnormallyHighFeeThreshold) {
            throw(E_NOF_ABNORMALLY_HIGH_FEE);
        }
        self.doDisburse(calc.fee, calc.growth);
    }

    // ── Disburse abnormally high fee (admin only) ──
    receive(msg: NofDisburseAbnormallyHighFee) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        let calc = self.calculateFee();
        self.doDisburse(calc.fee, calc.growth);
    }

    // ── Set fee rate (admin + manager dual confirmation simplified: admin only with fresh report) ──
    receive(msg: NofSetFeeRate) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        if (!self.reportFresh) {
            throw(E_NOF_REPORT_STALE);
        }
        if (self.latestCorrectionTimestamp >= self.lastReportTimestamp) {
            throw(E_NOF_CORRECTION_AFTER_REPORT);
        }

        // Disburse outstanding fees at current rate first
        let calc = self.calculateFee();
        if (calc.fee <= calc.abnormallyHighFeeThreshold) {
            self.doDisburse(calc.fee, calc.growth);
        }

        self.setFeeRateInternal(msg.newFeeRate);
    }

    // ── Correct settled growth ──
    receive(msg: NofCorrectSettledGrowth) {
        self.requireAdmin();
        self.consumeQuery(msg.queryId);
        if (self.settledGrowth != msg.expectedSettledGrowth) {
            throw(E_NOF_UNEXPECTED_SETTLED_GROWTH);
        }
        self.correctSettledGrowthInternal(msg.newSettledGrowth);
    }

    // ── Add fee exemption ──
    receive(msg: NofAddFeeExemption) {
        let s = sender();
        require(s == self.feeExemptRole || s == self.admin, "Unauthorized");
        self.consumeQuery(msg.queryId);
        if (msg.exemptedAmount > MAX_SANE_SETTLED_GROWTH) {
            throw(E_NOF_UNEXPECTED_EXEMPTION_AMOUNT);
        }
        self.correctSettledGrowthInternal(self.settledGrowth + msg.exemptedAmount);
    }

    // ── Set fee recipient ──
    receive(msg: NofSetFeeRecipient) {
        self.requireAdminOrManager();
        self.consumeQuery(msg.queryId);
        self.setFeeRecipientInternal(msg.newFeeRecipient);
    }

    // ── Getters ──

    get fun get_admin(): Address { return self.admin; }
    get fun get_node_operator_manager(): Address { return self.nodeOperatorManager; }
    get fun get_fee_exempt_role(): Address { return self.feeExemptRole; }
    get fun get_fee_recipient(): Address { return self.feeRecipient; }
    get fun get_fee_rate(): Int { return self.feeRate; }
    get fun get_settled_growth(): Int { return self.settledGrowth; }
    get fun get_latest_correction_timestamp(): Int { return self.latestCorrectionTimestamp; }
    get fun get_report_fresh(): Bool { return self.reportFresh; }
    get fun get_last_report_timestamp(): Int { return self.lastReportTimestamp; }

    get fun get_accrued_fee(): Int {
        let calc = self.calculateFee();
        return calc.fee;
    }

    get fun get_query_processed(queryId: Int): Bool {
        return self.processedQueries.get(queryId) != null;
    }

    // ── Internal ──

    fun calculateFee(): FeeCalcResult {
        let totalValueAndQuarantine = self.lastReportTotalValue + self.lastReportQuarantineValue;
        let growth = totalValueAndQuarantine - self.lastReportInOutDelta;
        let unsettledGrowth = growth - self.settledGrowth;
        let fee: Int = 0;
        if (unsettledGrowth > 0) {
            fee = (unsettledGrowth * self.feeRate) / NOF_TOTAL_BASIS_POINTS;
        }
        let abnormallyHighFeeThreshold = (totalValueAndQuarantine * ABNORMALLY_HIGH_FEE_THRESHOLD_BP) / NOF_TOTAL_BASIS_POINTS;
        return FeeCalcResult{
            fee: fee,
            growth: growth,
            abnormallyHighFeeThreshold: abnormallyHighFeeThreshold
        };
    }

    fun doDisburse(fee: Int, growth: Int) {
        if (fee == 0) {
            if (growth > self.settledGrowth) {
                self.setSettledGrowthInternal(growth);
            }
            return;
        }
        self.setSettledGrowthInternal(growth);

        send(SendParameters{
            to: self.feeRecipient,
            value: fee,
            bounce: true,
            body: "fee_disbursement".asComment()
        });
    }

    fun setSettledGrowthInternal(newSettledGrowth: Int) {
        if (self.settledGrowth == newSettledGrowth) {
            throw(E_NOF_SAME_SETTLED_GROWTH);
        }
        self.settledGrowth = newSettledGrowth;
    }

    fun correctSettledGrowthInternal(newSettledGrowth: Int) {
        self.setSettledGrowthInternal(newSettledGrowth);
        self.latestCorrectionTimestamp = now();
    }

    fun setFeeRateInternal(newFeeRate: Int) {
        if (newFeeRate > NOF_TOTAL_BASIS_POINTS) {
            throw(E_NOF_FEE_EXCEEDS_100);
        }
        self.feeRate = newFeeRate;
    }

    fun setFeeRecipientInternal(newFeeRecipient: Address) {
        if (newFeeRecipient == self.feeRecipient) {
            throw(E_NOF_SAME_RECIPIENT);
        }
        self.feeRecipient = newFeeRecipient;
    }

    fun stopFeeAccrual() {
        if (self.settledGrowth < MAX_SANE_SETTLED_GROWTH) {
            self.setSettledGrowthInternal(MAX_SANE_SETTLED_GROWTH);
        }
    }

    fun requireAdmin() {
        if (sender() != self.admin) {
            throw(E_NOF_UNAUTHORIZED);
        }
    }

    fun requireAdminOrManager() {
        let s = sender();
        if (s != self.admin && s != self.nodeOperatorManager) {
            throw(E_NOF_UNAUTHORIZED);
        }
    }

    fun consumeQuery(queryId: Int) {
        require(queryId > 0, "Invalid queryId");
        if (self.processedQueries.get(queryId) != null) {
            throw(E_NOF_REPLAY);
        }
        self.processedQueries.set(queryId, true);
    }
}

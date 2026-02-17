# TON StakingVault Migration - Opcode & Interface Spec

## Contracts
- `StakingVault` (`contracts/StakingVault.tact`)
- `UpgradeController` (`contracts/UpgradeController.tact`)
- `WithdrawalAdapterStub` (`contracts/WithdrawalAdapterStub.tact`)

## 1) Message Opcodes / Interfaces

### StakingVault inbound
- `SetFee` `0x53465452`
  - `queryId:uint64`, `perValidatorFee:coins`
  - owner-only
- `Fund` `0x464E4456`
  - `queryId:uint64`
  - owner-only, requires `msg.value > 0`
- `Withdraw` `0x57445448`
  - `queryId:uint64`, `recipient:Address`, `amount:coins`
  - owner-only
- `SetDepositor` `0x53444550`
  - `queryId:uint64`, `depositor:Address`
  - owner-only
- `PauseBeaconDeposits` `0x50415553`
  - `queryId:uint64`
  - owner-only
- `ResumeBeaconDeposits` `0x5245534D`
  - `queryId:uint64`
  - owner-only
- `DepositToBeacon` `0x44425053`
  - `queryId:uint64`, `validatorsCount:uint16`, `totalAmount:coins`
  - depositor-only, blocked if paused
- `RequestValidatorExit` `0x52455854`
  - `queryId:uint64`, `validatorsCount:uint16`
  - owner-only
- `TriggerValidatorWithdrawal` `0x54525744`
  - `queryId:uint64`, `validatorsCount:uint16`, `refundRecipient:Address`
  - owner-only, fee-checked
- `AuthorizeUpgrade` `0x41555047`
  - `queryId:uint64`, `codeHash:uint256`
  - controller-only
- `String("ossify")`
  - owner-only irreversible ossification

### StakingVault outbound
- to adapter: `AdapterTriggerWithdrawal` `0x41545057`
  - `queryId:uint64`, `validatorsCount:uint16`
  - `bounce=true`, exact fee forwarded
- excess fee refund transfer to `refundRecipient`
- on bounce of adapter message: pending fee refunded to `pendingRefundRecipient`

### UpgradeController inbound
- `ProposeUpgrade` `0x50525550`
  - `queryId:uint64`, `vault:Address`, `codeHash:uint256`
  - governance-only
- `String("ossify")`
  - governance-only

### UpgradeController outbound
- to vault: `AuthorizeUpgrade` `0x41555047`
  - `queryId:uint64`, `codeHash:uint256`

### WithdrawalAdapterStub inbound
- `AdapterTriggerWithdrawal` `0x41545057`
  - stores last query/count

## 2) query_id Handling
- All state-changing messages carry `queryId:uint64`.
- Vault tracks pending withdrawal correlation:
  - `pendingQueryId`
  - `pendingFee`
  - `pendingRefundRecipient`
- Bounce handler matches by `queryId` and refunds pending fee.
- **Current limitation:** no long-term replay dictionary (auditor flagged this; see evidence).

## 3) State Layouts

### StakingVault state
- `owner: Address`
- `nodeOperator: Address`
- `depositor: Address`
- `upgradeController: Address`
- `withdrawalAdapter: Address`
- `beaconChainDepositsPaused: Bool`
- `ossified: Bool`
- `version: uint16`
- `withdrawalFeePerValidator: coins`
- `pendingQueryId: uint64`
- `pendingFee: coins`
- `pendingRefundRecipient: Address`
- `activeCodeHash: uint256`

### UpgradeController state
- `governance: Address`
- `ossified: Bool`

### WithdrawalAdapterStub state
- `lastQueryId: uint64`
- `lastValidatorsCount: uint16`

## 4) Error Codes
- `100` unauthorized
- `101` zero-value argument/value
- `102` invalid argument
- `103` paused
- `104` already paused
- `105` already resumed
- `106` ossified
- `107` insufficient withdrawal fee
- `108` upgrade not authorized (reserved)

## 5) Events / Log Surface
- No explicit event cells emitted in this Tact version.
- Operational observability is via transaction traces + opcode-bearing message bodies.
- For indexers, recommended production extension is explicit event messages/log contracts.

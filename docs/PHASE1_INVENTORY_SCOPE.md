# Phase 1 — Lido inventory and migration scope selection

Date: 2026-02-17

## Source inventory method
- Enumerated public repositories from `https://api.github.com/orgs/lidofinance/repos` (244 repos discovered).
- Focused contract-heavy repos for migration relevance:
  - `lidofinance/core`
  - `lidofinance/lido-vault`
  - `lidofinance/withdrawals-manager-stub`

## Contract inventory highlights
### `core`
Primary protocol and vault families detected:
- `contracts/0.8.25/vaults/StakingVault.sol`
- `contracts/0.8.25/vaults/VaultHub.sol`
- `contracts/0.8.25/vaults/VaultFactory.sol`
- `contracts/0.8.25/vaults/OperatorGrid.sol`
- `contracts/0.8.25/vaults/LazyOracle.sol`
- `contracts/0.8.9/Lido.sol`, `StakingRouter.sol`, `WithdrawalQueue.sol`, `WithdrawalVault*.sol`, oracle modules

### `lido-vault`
- `contracts/LidoVault.vy` (vault wrapper behavior and ERC20-like share accounting)

### `withdrawals-manager-stub`
- `contracts/WithdrawalsManagerStub.sol`
- `contracts/WithdrawalsManagerProxy.sol`

## Scope decision (rationale)
### Wave 1 (executed): **Staking-vault path first**
Chosen as first migration slice because it has clear ownership/depositor/withdrawal controls and explicit operational boundaries suitable for TVM async messaging:
- `fund`, `withdraw`
- `pause/resume beacon deposits`
- `depositToBeaconChain` role gating
- `requestValidatorExit`
- `triggerValidatorWithdrawals` + fee and refund handling
- upgrade/ossify control points

### Wave 2 (planned expansion)
After wave-1 correctness gate:
- VaultHub + VaultFactory orchestration
- Node-operator fee and permissions modules
- selected withdrawal queue adapters

## TVM adaptation constraints
- EVM synchronous call + revert semantics mapped to TVM message/bounce semantics.
- Explicit replay-protection (`queryId`) required in TON layer.
- Upgrade behavior represented as authorization gate + ossification lock.

## Out-of-scope for this run
- Full Lido DAO core (`Lido.sol`, accounting oracles, queue NFTs) end-to-end port.
- Cross-chain wrappers and UI/tooling repos.

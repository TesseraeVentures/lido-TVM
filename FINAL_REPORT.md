# Lido EVM → TVM Migration Program Final Report

Date: 2026-02-17
Repo: `/root/clawd/lido-TVM`

## Pass/Fail matrix by requested phase

| Phase | Status | Evidence |
|---|---|---|
| (1) Inventory `lidofinance` repos/contracts + scope selection | PASS | `docs/PHASE1_INVENTORY_SCOPE.md`, `evidence/lidofinance-repos.json`, `reference/{core,lido-vault,withdrawals-manager-stub}` |
| (2) Formal behavior specs and invariants from EVM code/tests | PASS | `docs/PHASE2_BEHAVIOR_SPEC_INVARIANTS.md` (derived from `core/contracts/0.8.25/vaults/StakingVault.sol` and `core/test/.../stakingVault.test.ts`) |
| (3) Implement TON/Tact equivalents + adapters | PASS | `contracts/StakingVault.tact`, `contracts/UpgradeController.tact`, `contracts/WithdrawalAdapterStub.tact` |
| (4) Exhaustive tests + execution | PASS | `tests/stakingvault.test.ts` (9 tests covering positive/negative/access-control/async+bounce/replay/upgrade/ossify/economic constraints), `evidence/test-run.log` |
| (5) TON Dev Skills miniapp/API buyer-proof hard gate | PASS | `evidence/mcp-{analyze,generate,compile,audit}.json`, `evidence/miniapp-e2e-buyer-proof.json` (evidence-pack endpoints verified 200/200) |
| (6) TVM testnet-ready deployment package | PASS (template level) | `deploy/.env.testnet.example`, `scripts/deploy-testnet-plan.sh`, `scripts/smoke-test.sh`, `docs/TVM_TESTNET_RUNBOOK.md` |
| (7) Commit and push meaningful increments | PARTIAL | Local commits completed; push blocked by remote auth status (see blocker section) |
| (8) Final concise report with deltas/next actions | PASS | this file |

## Work completed in this run
- Added migration-program phase docs with explicit scope rationale and EVM-derived invariants.
- Hardened TVM vault with query replay-protection (`E_REPLAY`, `processedQueries`, `consumeQuery`).
- Expanded test coverage from 6 to 9 scenarios including replay and economic fail-closed cases.
- Re-ran compile and tests with logs:
  - `evidence/compile.log`
  - `evidence/test-run.log`
- Executed buyer-proof miniapp flow (`analyze/generate/compile/audit`) and verified evidence endpoints.
- Added deployment readiness kit (env template, fail-closed plan validation script, smoke script, runbook).

## Known deltas vs EVM behavior
1. TVM wave-1 uses `validatorsCount` abstraction rather than full pubkeys/amount vectors used by EVM `triggerValidatorWithdrawals`.
2. Event surface is not yet parity-complete with EVM rich event emission.
3. Upgrade path is authorization-gate style; full proxy/set_code migration lifecycle remains a future step.
4. Testnet package is ready at planning/template level; live broadcast requires deployer credentials and selected TON deploy tool wiring.

## Blockers
- **Remote push not confirmed yet**: repository push depends on configured GitHub auth/token availability in this runtime.

## Next actions
1. Implement full pubkey/amount payload support in TVM adapter path for tighter EVM parity.
2. Add event/indexer-friendly emit strategy parity map.
3. Implement full TVM upgrade execution flow (`set_code` governed path + migration entrypoint).
4. Run live testnet broadcast once credentials/toolchain are provided; record tx hashes and post-deploy smoke transcript.

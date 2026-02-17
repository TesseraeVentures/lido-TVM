# Phase 2 — Behavioral specification and invariants (EVM → TVM)

Date: 2026-02-17
Primary EVM references:
- `core/contracts/0.8.25/vaults/StakingVault.sol`
- `core/test/0.8.25/vaults/stakingVault/stakingVault.test.ts`

## Behavioral spec (selected equivalence surface)

1. **Role control**
   - Owner-only: `fund`, `withdraw`, pause/resume, `setDepositor`, `requestValidatorExit`, upgrade controls.
   - Depositor-only: beacon deposit path.
   - Upgrade-controller-only: upgrade authorization message.

2. **Deposit gating**
   - Deposits rejected when paused.
   - Deposits require positive validators count and positive amount.

3. **Withdrawal trigger economics**
   - Required fee = `withdrawalFeePerValidator * validatorsCount`.
   - Reject when attached value < required fee.
   - Forward required fee to withdrawal adapter.
   - Refund excess to refund recipient.

4. **Asynchronous failure handling**
   - If adapter call bounces, refund pending fee and clear pending state.

5. **Upgrade and ossify**
   - Upgrade authorization accepted only from controller.
   - Ossified state permanently blocks future authorization.

6. **Replay protection (TVM-specific hardening)**
   - Every state-changing operation consumes unique `queryId`.
   - Reused `queryId` fails closed.

## Invariant set

- **INV-01 Access control**: unauthorized sender cannot mutate privileged state.
- **INV-02 Pause safety**: when paused, depositor path is unavailable.
- **INV-03 Fee lower bound**: no withdrawal trigger with underpayment.
- **INV-04 Conservation-on-trigger**: required fee is either consumed by adapter call or refunded on bounce.
- **INV-05 Replay safety**: each accepted query ID can execute once.
- **INV-06 Ossify finality**: after ossify, upgrade authorization cannot succeed.
- **INV-07 Input sanity**: zero-value/zero-count operations are rejected.

## Known semantic deltas vs EVM

- EVM emits rich events for validator keys and accounting; TVM implementation currently prioritizes state correctness and message flow over full event parity.
- EVM `triggerValidatorWithdrawals` supports pubkeys/amount vectors; TVM wave-1 abstraction uses `validatorsCount` fee model and adapter handoff.
- Upgrade execution in EVM proxy architecture is more extensive than current TVM authorization-gate model.

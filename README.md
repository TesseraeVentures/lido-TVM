# lido-TVM

Behavioral-equivalent TON/TVM migration workstream for Lido protocol components.

## Current status
- Initial migration pack for StakingVault flow imported.
- Includes opcode/interface spec, Tact contract set, tests, and evidence artifacts.

## Structure
- `contracts/` — Tact contracts
- `tests/` — sandbox tests
- `docs/` — migration/architecture specs
- `evidence/` — run artifacts and E2E proof outputs

## Goal
Ship TVM testnet-ready implementations that preserve EVM protocol behavior (behavioral equivalence), with explicit evidence gates.

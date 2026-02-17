#!/usr/bin/env bash
set -euo pipefail

# Planning/validation script (non-broadcast) for TVM testnet readiness.
# It fails closed if required env vars are missing.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/deploy/.env.testnet}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

required=(TON_API_ENDPOINT DEPLOYER_MNEMONIC OWNER_ADDRESS NODE_OPERATOR_ADDRESS DEPOSITOR_ADDRESS GOVERNANCE_ADDRESS)
for k in "${required[@]}"; do
  if [[ -z "${!k:-}" ]]; then
    echo "missing required variable: $k" >&2
    exit 1
  fi
done

cd "$ROOT"
mkdir -p evidence

npm run build | tee evidence/deploy-plan-build.log

echo "deployment plan check passed (no broadcast performed)" | tee evidence/deploy-plan.log

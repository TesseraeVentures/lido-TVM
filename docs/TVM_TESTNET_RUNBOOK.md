# TVM Testnet Readiness Runbook

## 1) Preconditions
- Node.js/npm installed
- TON testnet API access
- Deployer mnemonic funded on testnet
- Addresses prepared for owner/node-operator/depositor/governance

## 2) Configure environment
```bash
cp deploy/.env.testnet.example deploy/.env.testnet
# edit deploy/.env.testnet with real values
```

## 3) Local quality gates (must pass)
```bash
npm run build
npm test
scripts/smoke-test.sh
```

## 4) Plan validation (fail-closed)
```bash
scripts/deploy-testnet-plan.sh deploy/.env.testnet
```

## 5) Deployment execution
This repo currently provides testnet planning and artifact readiness; broadcast tooling should be plugged into preferred TON deploy stack (Blueprint/TON CLI/SDK) using generated build artifacts in `build/`.

## 6) Post-deploy smoke checklist
- Contract addresses recorded
- Get-methods return expected owner/depositor/paused=false/ossified=false
- Triggered withdrawal path sends adapter message with expected queryId
- Replay test on identical queryId fails
- Pause/resume flow works with depositor path blocked while paused

## 7) Evidence to archive
- Build and test logs from `evidence/`
- deployment transaction hashes
- post-deploy smoke transcript (commands and outputs)

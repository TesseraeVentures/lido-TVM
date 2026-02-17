#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p evidence

printf '[smoke] build\n'
npm run build | tee evidence/smoke-build.log

printf '[smoke] tests\n'
npm run test:unit | tee evidence/smoke-test.log

printf '[smoke] done\n'

#!/usr/bin/env bash
# Runs every static check in the swarm without needing an agent runtime.
# Useful in CI, or as a pre-deploy gate. Exit code is non-zero if any check
# fails, so it can gate a pipeline directly.
set -uo pipefail
ROOT="${1:-.}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail=0

for check in schema-check rls-check order-flow-check site-check; do
  node "$DIR/$check.mjs" "$ROOT" || fail=1
  echo "------------------------------------------------------------"
done

# Undefined names and unresolved imports — the class of bug that shipped twice.
# Uses stub module declarations so it works without node_modules.
if command -v tsc >/dev/null 2>&1 && [ -f "$ROOT/.checks/tsconfig.scope.json" ]; then
  # Vendored shadcn components are excluded, as they are in the app tsconfig.
  ( cd "$ROOT" && tsc -p .checks/tsconfig.scope.json 2>&1 ) \
    | grep -v "components/ui/" | grep -E "error TS" > /tmp/prepnest-types.log
  if [ -s /tmp/prepnest-types.log ]; then
    echo "TYPES: FAILED — $(wc -l < /tmp/prepnest-types.log) error(s)"
    head -10 /tmp/prepnest-types.log
    fail=1
  else
    echo "TYPES: clean (strict, all imports resolved)"
  fi
else
  echo "TYPES: skipped (needs tsc)"
fi
echo "------------------------------------------------------------"

# Behaviour, not just structure. Skipped rather than failed when the runner is
# too old for --experimental-strip-types, so an old Node blocks nothing.
if node -e "process.exit(process.version.split('.')[0].slice(1) >= 22 ? 0 : 1)" 2>/dev/null; then
  # Two runners: the pure-module suite, and the handler suite which needs the
  # Next/Supabase stubs on its resolver. Running them together under one
  # resolver fails for a reason that has nothing to do with the code.
  ( cd "$ROOT" \
    && node --experimental-strip-types --import ./tests/register.mjs --test --test-reporter=tap \
         $(ls tests/*.test.ts | grep -v handlers) >/tmp/prepnest-tests.log 2>&1 \
    && node --experimental-strip-types --import ./tests/stubs/register-stubs.mjs --test --test-reporter=tap \
         tests/handlers.test.ts >>/tmp/prepnest-tests.log 2>&1 ) \
    && echo "TESTS: $(awk '/^# pass /{n+=$3} END{print n+0}' /tmp/prepnest-tests.log) passing, $(awk '/^# fail /{n+=$3} END{print n+0}' /tmp/prepnest-tests.log) failing" \
    || { echo "TESTS: FAILED"; tail -25 /tmp/prepnest-tests.log; fail=1; }
else
  echo "TESTS: skipped (needs Node 22+)"
fi
echo "------------------------------------------------------------"

if [ "$fail" -ne 0 ]; then
  echo "PREPNEST PRE-DEPLOY: blocked. See findings above."
  exit 1
fi
echo "PREPNEST PRE-DEPLOY: static checks clear. Build verification still required."

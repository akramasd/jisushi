---
description: Run the full PREPNEST readiness audit against this repo
---

Run the complete PREPNEST readiness audit on the current repository.

Dispatch the `prepnest-orchestrator` agent. It should run schema-guardian,
security-auditor, order-flow-integrity and template-consistency in parallel,
then build-verifier last.

Return a single merged report grouped by severity, ending with a plain verdict:
ready to ship, or not — and if not, the shortest path to ready.

Do not apply fixes unless I ask.

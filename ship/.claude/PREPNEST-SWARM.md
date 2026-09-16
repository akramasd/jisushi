# PREPNEST agent swarm

Five specialists and an orchestrator. Designed to run once against the Ji Sushi
repo today, and to stay in place as a standing pre-deploy gate for every
PREPNEST restaurant afterwards.

## Install

Drop the `.claude/` folder into the repo root. Claude Code picks up
`agents/` and `commands/` automatically.

```
.claude/
  agents/
    prepnest-orchestrator.md   runs the swarm, merges findings, sequences fixes
    schema-guardian.md         SQL vs. code column drift
    security-auditor.md        RLS policies + staff-route auth
    order-flow-integrity.md    the money path
    build-verifier.md          actually builds it
    site-integrity.md          undefined names, dead links, missing directives
    template-consistency.md    keeps it forkable per restaurant
  commands/
    prepnest-audit.md          /prepnest-audit
  scripts/
    schema-check.mjs           \
    rls-check.mjs               >  the static checks, runnable without agents
    order-flow-check.mjs       /
    run-all.sh                 CI gate — non-zero exit blocks the deploy
```

## Run it

With agents:

```
/prepnest-audit
```

Without agents — plain Node, no dependencies, works in CI:

```bash
bash .claude/scripts/run-all.sh .
```

## Why the checks are scripts, not just prompts

Four of the five agents are backed by a real script. An agent that greps and
reasons will find these issues most of the time; a script finds them every
time, costs nothing to run, and can gate a deploy pipeline without a model in
the loop. The agent wrapper adds the judgement the script can't have — which
side of a mismatch is wrong, whether a tighter policy will take the restaurant
offline mid-service, what to fix first.

## Current findings against `jisushi-main-2`

```
SCHEMA GUARDIAN     2 FAIL   menu_items.available vs. schema's is_available
                             (app/api/checkout/route.ts:43, app/takeaway/page.tsx:31)
SECURITY AUDITOR   10 FAIL   anon_all USING(true) on orders, menu_items,
                             loyalty_customers, push_subscriptions;
                             RLS never enabled on settings;
                             /kitchen publicly reachable
ORDER-FLOW          5 PASS   1 WARN — no rate limiting on /api/checkout
BUILD VERIFIER      not run  no network in this environment; build has never
                             been run in any environment per MERGE-NOTES.md
```

Verdict: not ready to ship. The schema mismatch means takeaway ordering does
not work at all, and the RLS policies expose every customer's name and phone
number to anyone who opens devtools.

## Fix order

1. Schema mismatch — nothing else can be tested end to end until ordering works.
2. RLS + `/kitchen` auth — live data exposure, but tighten only on a stable schema.
3. Rate limiting on checkout.
4. Template extraction for the next restaurant.
5. Build + a manual smoke order.

## Reuse for the next restaurant

Nothing in the scripts names Ji Sushi. Table sensitivity is matched on name
patterns (`order`, `customer`, `menu`, `setting`), staff routes on path patterns
(`kitchen`, `admin`, `kds`, `staff`), and the schema is read from whatever
`schema.sql` the repo has. Fork the template, keep `.claude/`, and the same
gate applies unchanged.

Where this sits in PREPNEST: Thalaja and Emila face the owner and talk about
the business. This swarm faces the deployment and talks about whether it works.
It should run before a Webify-built site goes live, and on every commit after.

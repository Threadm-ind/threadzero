# State

## Current Status
Phase 1 scaffold is implemented and validated locally.
Phase 2 retrieval storage, retrieval types, retrieval service, and CLI commands are implemented and validated against `local/vanguard`.
Phase 3 context packing is implemented and validated against a stored retrieval bundle.
Phase 4 executor adapter is implemented and validated locally. Claude Code launches correctly and execution runs are persisted.
Phase 5 continuation is implemented and validated locally. Checkpoints are created from prior runs and compact continuation prompts are generated without recursively embedding prior shell command noise.
Phase 6 benchmark storage and reporting are implemented and validated locally. Benchmark cases, baseline captures, `threadzero` run captures, and acceptance-style reports are available from the CLI.
Workflow automation is implemented and validated locally. `workflow auto` can derive work from GSD state, auto-index the current repo in jCodeMunch when needed, retrieve context, execute through Claude Code or Codex, checkpoint, and auto-capture `threadzero` benchmark runs.

## Current Phase
Phase 6: Verification and Benchmarking

## Next Recommended Action
Use `workflow auto` on real tasks, capture baseline prompts where needed, and collect 3 real benchmark comparisons for the acceptance report.

## Decisions Made
- Project name: `threadzero`
- Product direction: thin execution wrapper for coding agents
- Storage backend for v1: built-in `node:sqlite`
- Workflow style: retrieval -> pack -> execute -> checkpoint -> continue
- v1 focus: execution efficiency, not generalized autonomy
- primary executor target for v1: Claude Code first

## Open Questions
- whether Codex support lands in v1 or v1.1
- when Claude Code quota is available again for a successful end-to-end execution run
- what baseline prompt capture process should be treated as the canonical comparison method

## Constraints In Force
- keep v1 narrow
- no giant transcript memory
- no full agent framework
- no broad UI work before core loop is proven

## Immediate Goal
Collect real benchmark evidence once Claude quota resets, then finalize the acceptance report.

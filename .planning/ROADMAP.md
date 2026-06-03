# Roadmap

## Phase 1: Foundation
Outcome:
Create the repo skeleton, CLI shell, config model, task model, checkpoint model, and local storage.

Deliverables:
- CLI entrypoint
- config loader
- task schema
- checkpoint schema
- storage layer
- basic task lifecycle commands

## Phase 2: Retrieval Layer
Outcome:
Integrate `jcodemunch-mcp` and normalize retrieval output for downstream prompt packing.

Deliverables:
- symbol retrieval
- module summary retrieval
- config location retrieval
- call-path retrieval
- normalized retrieval response format

## Phase 3: Context Packing
Outcome:
Build a strict context packer that produces small execution prompts from task state and retrieved code context.

Deliverables:
- prompt templates
- token budget rules
- truncation strategy
- retrieval selection rules
- compact execution payload builder

## Phase 4: Executor Adapter
Outcome:
Run tasks through one primary coding agent.

Deliverables:
- executor adapter
- run lifecycle
- result capture
- failure handling
- normalized execution result format

## Phase 5: Checkpoints and Continuation
Outcome:
Resume work from checkpoint state in a fresh execution thread.

Deliverables:
- checkpoint summarizer
- checkpoint loader
- continuation prompt
- next-step state transition rules

## Phase 6: Verification and Benchmarking
Outcome:
Validate that `threadzero` improves efficiency on real coding tasks.

Deliverables:
- benchmark task set
- baseline workflow comparison
- token-efficiency notes
- quality comparison notes
- acceptance report

## Suggested Executor Order
1. Claude Code
2. Codex

Rationale:
The main pain point is Claude Code token burn. Validate the promise there first.

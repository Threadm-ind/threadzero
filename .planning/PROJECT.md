# Project: threadzero

## Goal
Build a thin execution wrapper for coding agents that reduces token waste by replacing bloated chat-thread state with retrieval-first context packing and resumable checkpoints.

## Problem
Long coding threads burn tokens on repeated repo context, oversized file reads, stale planning history, and redundant tool output. This makes coding agents feel expensive and inefficient, especially in execution-heavy workflows.

## Solution
`threadzero` will:
- accept a coding task
- retrieve only the relevant code context via `jcodemunch-mcp`
- build a compact execution prompt
- hand off execution to a coding agent
- save a compact checkpoint
- resume in a fresh thread without dragging full transcript history

## Target User
A developer using coding agents such as Claude Code or Codex who wants execution quality with much lower context waste.

## Primary Use Case
Run targeted implementation or bugfix tasks with:
- retrieval-first repo inspection
- minimal prompt packing
- checkpoint-based continuation
- fresh execution sessions

## Constraints
- v1 is execution-first
- no general-purpose autonomous agent framework
- no persistent giant transcript memory
- no full-repo ingestion by default
- retrieval-first, symbol-first
- one primary executor in v1
- local-first implementation

## Non-Goals
- polished GUI
- team collaboration
- multi-agent orchestration
- plugin ecosystem
- generalized memory platform
- model/provider abstraction for everything in v1

## Success Criteria
- complete real coding tasks using retrieval-first packed prompts
- resume work from compact checkpoints in fresh execution sessions
- reduce context waste versus a normal long-thread workflow
- demonstrate meaningful efficiency gains on at least 3 benchmark tasks

## v1 Scope
- task intake
- local storage for tasks and checkpoints
- `jcodemunch-mcp` retrieval integration
- context packer with budget rules
- one executor adapter
- checkpoint save/load
- fresh-thread continuation

## Risks
- scope creep into a full agent platform
- weak checkpoint summaries causing poor continuation quality
- retrieval packing that is too thin or too broad
- executor integration complexity

## Guiding Principle
`threadzero` should own state, retrieval, and context packing. The coding agent should only execute on the minimum necessary context.

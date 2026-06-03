# threadzero

A thin execution wrapper for coding agents. Stops token waste from bloated chat state by replacing long-thread memory with retrieval-first context, compact prompt packing, and resumable checkpoints.

---

## The Problem

Long coding-agent threads get expensive for predictable reasons:

- The same repo context gets re-explained every session
- Giant file reads get dragged forward through every turn
- Stale planning history pollutes the current step
- Shell noise and tool output eat context budget

threadzero fixes this by making the wrapper own state, retrieval, prompt packing, checkpoints, and benchmarking. The agent only gets the minimum context it needs for the current step.

---

## What It Does

At each execution step, threadzero runs this loop:

```
GSD state → retrieval → pack → execute → checkpoint → benchmark
```

1. Read the current task or derive it from GSD `.planning/` state
2. Retrieve focused code context through jCodeMunch
3. Build a compact execution prompt (only what this step needs)
4. Run Claude Code or Codex on that prompt
5. Save the execution run
6. Create a compact checkpoint
7. Optionally capture a benchmark record against your baseline

---

## Supported Agents

- **Claude Code**
- **Codex**

---

## Features

- **Task storage** — persistent task definitions
- **Checkpoint storage** — compact run state per step
- **Retrieval bundles** — jCodeMunch context snapshots, not full file reads
- **Compact context packing** — assembles only the symbols and context needed for the current task
- **Continuation** — resume from any checkpoint without re-explaining the full codebase
- **Benchmark capture** — compare runs against a baseline; track whether changes improve or degrade performance
- **GSD integration** — reads task state from `.planning/` workflow artifacts

---

## Stack

- TypeScript
- jCodeMunch (retrieval)
- Claude Code / Codex CLI
- Local JSON-based state storage

---

## Configuration

```json
// threadzero.config.json
{
  "agent": "claude-code",
  "retrieval": "jcodemunch",
  "checkpointDir": ".threadzero/checkpoints",
  "benchmarkDir": ".threadzero/benchmarks"
}
```

---

## Usage

```bash
npm install
npm run build

# Run a task
npx threadzero run --task "add input validation to the auth handler"

# Continue from last checkpoint
npx threadzero continue

# Run with benchmark capture
npx threadzero run --task "..." --benchmark

# View benchmark report
npx threadzero benchmark report
```

---

## Project Structure

```
src/
  runner/       Agent execution (Claude Code, Codex)
  retrieval/    jCodeMunch integration + bundle building
  packing/      Context packing — symbol selection, prompt assembly
  storage/      Task, checkpoint, retrieval bundle storage
  benchmark/    Benchmark case storage + comparison reporting
threadzero.config.json
```

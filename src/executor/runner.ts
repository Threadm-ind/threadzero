import { ExecutorName } from "../types";
import { ClaudeCodeExecutor } from "./claude-code";
import { CodexExecutor } from "./codex";
import { ExecutorAdapter, ExecutorRunInput, ExecutorRunResult } from "./types";

export function getExecutor(name: ExecutorName): ExecutorAdapter {
  if (name === "claude-code") {
    return new ClaudeCodeExecutor();
  }

  if (name === "codex") {
    return new CodexExecutor();
  }

  throw new Error(`Unsupported executor: ${name}`);
}

export function runExecutor(
  executorName: ExecutorName,
  input: ExecutorRunInput,
): ExecutorRunResult {
  return getExecutor(executorName).run(input);
}

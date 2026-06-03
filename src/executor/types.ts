import { EffortLevel } from "../types";

export interface ExecutorRunInput {
  prompt: string;
  cwd: string;
  effort?: EffortLevel;
}

export interface ExecutorRunResult {
  executor: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  status: "completed" | "failed";
}

export interface ExecutorAdapter {
  run(input: ExecutorRunInput): ExecutorRunResult;
}

import { execFileSync } from "node:child_process";
import { ExecutorAdapter, ExecutorRunInput, ExecutorRunResult } from "./types";

export class ClaudeCodeExecutor implements ExecutorAdapter {
  run(input: ExecutorRunInput): ExecutorRunResult {
    const effort = mapClaudeEffort(input.effort);

    try {
      const stdout =
        process.platform === "win32"
          ? execFileSync(
              "cmd.exe",
              ["/d", "/s", "/c", `claude -p --effort ${effort} ${quoteForCmd(input.prompt)}`],
              {
                cwd: input.cwd,
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
              },
            )
          : execFileSync("claude", ["-p", "--effort", effort, input.prompt], {
              cwd: input.cwd,
              encoding: "utf8",
              stdio: ["pipe", "pipe", "pipe"],
            });

      return {
        executor: "claude-code",
        stdout,
        stderr: "",
        exitCode: 0,
        status: "completed",
      };
    } catch (error: any) {
      return {
        executor: "claude-code",
        stdout: String(error?.stdout || ""),
        stderr: String(error?.stderr || error?.message || ""),
        exitCode: Number(error?.status || 1),
        status: "failed",
      };
    }
  }
}

function quoteForCmd(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function mapClaudeEffort(effort: ExecutorRunInput["effort"]): string {
  if (effort === "xhigh") return "max";
  return effort ?? "medium";
}

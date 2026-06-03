import { ExecutionRunRow } from "../storage/runs";

export interface RunSummary {
  summary: string;
  nextStep: string;
  decisions: string[];
  openQuestions: string[];
}

export function summarizeRun(run: ExecutionRunRow): RunSummary {
  const stdout = cleanOutput(run.stdout_text);
  const stderr = cleanOutput(run.stderr_text);
  const limitMessage = detectLimitMessage(stdout, stderr);

  if (limitMessage) {
    return {
      summary: "Claude execution was blocked by plan limit.",
      nextStep: "Retry after quota reset or switch executor.",
      decisions: [],
      openQuestions: [limitMessage],
    };
  }

  const summarySource = firstNonEmpty(stdout, stderr);
  const summary = summarySource
    ? truncate(summarySource, 400)
    : "Execution completed with no captured output.";

  return {
    summary,
    nextStep:
      run.status === "failed" || run.exit_code !== 0
        ? "Fix the failure from the last execution result and rerun."
        : "Continue from the completed work and finish the next smallest implementation step.",
    decisions: [],
    openQuestions: stderr ? [truncate(stderr, 180)] : [],
  };
}

function cleanOutput(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Command failed:"))
    .filter((line) => !line.startsWith("(node:"))
    .filter((line) => !line.startsWith("(Use `node"));

  return lines.join("\n").trim();
}

function detectLimitMessage(stdout: string, stderr: string): string {
  const combined = [stdout, stderr].filter(Boolean).join("\n");
  const match = combined.match(/You've hit your limit[^\n]*/i);
  return match ? truncate(match[0], 120) : "";
}

function firstNonEmpty(...values: string[]): string {
  return values.find((value) => Boolean(value)) ?? "";
}

function truncate(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 3).trim()}...`;
}

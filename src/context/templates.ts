export function executionHeader(goal: string): string {
  return [
    `Task: ${goal}`,
    "Mode: execution",
    "Instruction: make the required code change using only the provided context.",
  ].join("\n");
}

export function continuationHeader(goal: string): string {
  return [
    `Task: ${goal}`,
    "Mode: continuation",
    "Instruction: continue the task from the checkpoint and latest execution result without relying on prior transcript.",
  ].join("\n");
}

export function executionFooter(): string {
  return [
    "Return:",
    "- code changes made",
    "- tests or checks run",
    "- short completion summary",
  ].join("\n");
}

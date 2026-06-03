import fs from "node:fs";
import path from "node:path";

export interface GsdStateSnapshot {
  currentPhase: string;
  nextRecommendedAction: string;
  immediateGoal: string;
}

export function loadGsdState(cwd = process.cwd()): GsdStateSnapshot | null {
  const statePath = path.join(cwd, ".planning", "STATE.md");
  if (!fs.existsSync(statePath)) {
    return null;
  }

  const text = fs.readFileSync(statePath, "utf8");
  return {
    currentPhase: readSection(text, "Current Phase"),
    nextRecommendedAction: readSection(text, "Next Recommended Action"),
    immediateGoal: readSection(text, "Immediate Goal"),
  };
}

function readSection(markdown: string, heading: string): string {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, "i");
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { estimateTokens } from "./budget";
import { renderSections } from "./render";
import { continuationHeader, executionFooter, executionHeader } from "./templates";
import { PackedContextInput, PackedContextResult, PackedContextSection } from "./types";

export function packContext(
  input: PackedContextInput,
  mode: "execute" | "continue" = "execute",
): PackedContextResult {
  const sections: PackedContextSection[] = [];

  sections.push({
    label: "Goal",
    priority: 100,
    content: input.task.goal,
  });

  if (input.task.current_step) {
    sections.push({
      label: "Current Step",
      priority: 95,
      content: input.task.current_step,
    });
  }

  const constraints = parseJsonArray(input.task.constraints_json);
  if (constraints.length) {
    sections.push({
      label: "Constraints",
      priority: 90,
      content: constraints.map((item) => `- ${item}`).join("\n"),
    });
  }

  if (input.latestCheckpoint) {
    sections.push({
      label: "Latest Checkpoint",
      priority: 85,
      content: [
        `Summary: ${input.latestCheckpoint.summary}`,
        input.latestCheckpoint.next_step ? `Next Step: ${input.latestCheckpoint.next_step}` : "",
      ].filter(Boolean).join("\n"),
    });
  }

  if (input.retrieval?.symbols.length) {
    sections.push({
      label: "Relevant Symbols",
      priority: 80,
      content: input.retrieval.symbols.slice(0, 8).map((symbol) =>
        [
          `- ${symbol.name} (${symbol.kind})`,
          symbol.file ? `  file: ${symbol.file}` : "",
          symbol.signature ? `  signature: ${symbol.signature}` : "",
          symbol.summary ? `  summary: ${symbol.summary}` : "",
        ].filter(Boolean).join("\n"),
      ).join("\n"),
    });
  }

  if (input.retrieval?.modules.length) {
    sections.push({
      label: "Module Summaries",
      priority: 70,
      content: input.retrieval.modules.slice(0, 3).map((module) =>
        `- file: ${module.file}\n  summary: ${module.summary}`,
      ).join("\n"),
    });
  }

  if (input.retrieval?.calls) {
    sections.push({
      label: "Call Path",
      priority: 60,
      content: [
        "Callers:",
        ...input.retrieval.calls.callers.slice(0, 5).map((item) => `- ${item.name} (${item.file})`),
        "",
        "Callees:",
        ...input.retrieval.calls.callees.slice(0, 5).map((item) => `- ${item.name} (${item.file})`),
      ].join("\n"),
    });
  }

  if (input.retrieval?.configs.length) {
    sections.push({
      label: "Config Matches",
      priority: 50,
      content: input.retrieval.configs.slice(0, 5).map((item) =>
        `- ${item.file}${item.line ? `:${item.line}` : ""} ${item.text}`,
      ).join("\n"),
    });
  }

  const sorted = sections.sort((a, b) => b.priority - a.priority);
  const kept: PackedContextSection[] = [];
  let truncated = false;

  for (const section of sorted) {
    const candidate = [
      mode === "continue" ? continuationHeader(input.task.goal) : executionHeader(input.task.goal),
      renderSections([...kept, section]),
      executionFooter(),
    ].join("\n\n");

    if (estimateTokens(candidate) <= input.budgetTokens) {
      kept.push(section);
    } else {
      truncated = true;
    }
  }

  const prompt = [
    mode === "continue" ? continuationHeader(input.task.goal) : executionHeader(input.task.goal),
    renderSections(kept),
    executionFooter(),
  ].join("\n\n");

  return {
    prompt,
    sections: kept,
    estimatedTokens: estimateTokens(prompt),
    truncated,
  };
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

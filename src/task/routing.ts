import { RetrievalBundle } from "../retrieval/types";
import { ExecutionRunRepository } from "../storage/runs";
import {
  EffortLevel,
  ExecutorName,
  RouteCategory,
  ThreadzeroConfig,
} from "../types";

export interface RoutingInput {
  goal: string;
  query: string;
  currentPhase: string;
  nextStep: string;
  retrieval: RetrievalBundle | null;
  executorOverride?: ExecutorName;
  effortOverride?: EffortLevel;
}

export interface RoutingDecision {
  category: RouteCategory;
  executor: ExecutorName;
  effort: EffortLevel;
  confidence: number;
  reasons: string[];
  signals: Record<string, unknown>;
  overrides: Record<string, unknown>;
}

export class RoutingService {
  constructor(
    private readonly config: ThreadzeroConfig,
    private readonly runs: ExecutionRunRepository,
  ) {}

  decide(input: RoutingInput): RoutingDecision {
    const category = classifyTask(input);
    const rule = this.config.routing.rules[category];
    const reasons: string[] = [`classified task as ${category}`];
    const signals = buildSignals(input, category);

    let executor = rule.executor;
    let effort = rule.effort;
    let confidence = baseConfidenceFor(category);

    if ((signals.symbolCount as number) >= 6 || (signals.moduleCount as number) >= 3) {
      reasons.push("retrieval breadth suggests higher complexity");
      effort = raiseEffort(effort);
      confidence += 0.04;
    }

    if ((signals.multiFile as boolean) && category !== "docs") {
      reasons.push("retrieval spans multiple files");
      effort = raiseEffort(effort);
    }

    if (this.config.routing.enable_history_bias) {
      const historyHint = this.deriveHistoryHint();
      if (historyHint) {
        reasons.push(historyHint.reason);
        executor = historyHint.executor ?? executor;
        effort = historyHint.effort ?? effort;
      }
    }

    const overrides: Record<string, unknown> = {};
    if (input.executorOverride) {
      executor = input.executorOverride;
      overrides.executor = input.executorOverride;
      reasons.push(`executor overridden to ${input.executorOverride}`);
      confidence = Math.max(confidence, 0.95);
    }
    if (input.effortOverride) {
      effort = input.effortOverride;
      overrides.effort = input.effortOverride;
      reasons.push(`effort overridden to ${input.effortOverride}`);
      confidence = Math.max(confidence, 0.95);
    }

    return {
      category,
      executor,
      effort,
      confidence: roundConfidence(confidence),
      reasons,
      signals,
      overrides,
    };
  }

  private deriveHistoryHint():
    | { reason: string; executor?: ExecutorName; effort?: EffortLevel }
    | null {
    const recent = this.runs.listRecent(8);
    const codexSuccesses = recent.filter((run) => run.executor === "codex" && run.status === "completed");
    const claudeFailures = recent.filter((run) => run.executor === "claude-code" && run.status === "failed");

    if (codexSuccesses.length >= 3 && claudeFailures.length >= 2) {
      return {
        reason: "recent local history favors codex",
        executor: "codex",
      };
    }

    return null;
  }
}

function classifyTask(input: RoutingInput): RouteCategory {
  const haystack = [input.goal, input.query, input.currentPhase, input.nextStep]
    .join(" ")
    .toLowerCase();

  if (/\b(readme|docs?|documentation|comment|copy|wording)\b/.test(haystack)) return "docs";
  if (/\b(plan|roadmap|milestone|phase|research|assumption)\b/.test(haystack)) return "planning";
  if (/\b(debug|bug|fix|failure|broken|error|investigate|root cause)\b/.test(haystack)) return "debugging";
  if (/\b(refactor|restructure|reorganize|rename|migrate)\b/.test(haystack)) return "refactor";
  if (/\b(test|verify|validation|regression|check)\b/.test(haystack)) return "verification";
  if (/\b(add|implement|build|create|support|integrate)\b/.test(haystack)) return "feature";
  if (/\b(change|update|adjust|tweak|edit)\b/.test(haystack)) return "simple_edit";
  return "unknown";
}

function buildSignals(input: RoutingInput, category: RouteCategory): Record<string, unknown> {
  const files = new Set<string>();
  for (const symbol of input.retrieval?.symbols ?? []) files.add(symbol.file);
  for (const module of input.retrieval?.modules ?? []) files.add(module.file);

  return {
    category,
    symbolCount: input.retrieval?.symbols.length ?? 0,
    moduleCount: input.retrieval?.modules.length ?? 0,
    callerCount: input.retrieval?.calls?.callers.length ?? 0,
    calleeCount: input.retrieval?.calls?.callees.length ?? 0,
    configCount: input.retrieval?.configs.length ?? 0,
    multiFile: files.size > 1,
    currentPhase: input.currentPhase,
  };
}

function baseConfidenceFor(category: RouteCategory): number {
  switch (category) {
    case "docs":
    case "planning":
    case "debugging":
    case "feature":
      return 0.78;
    case "refactor":
      return 0.72;
    case "verification":
    case "simple_edit":
      return 0.75;
    default:
      return 0.6;
  }
}

function raiseEffort(effort: EffortLevel): EffortLevel {
  if (effort === "low") return "medium";
  if (effort === "medium") return "high";
  if (effort === "high") return "xhigh";
  return "xhigh";
}

function roundConfidence(value: number): number {
  return Math.max(0, Math.min(0.99, Math.round(value * 100) / 100));
}

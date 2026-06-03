import { estimateTokens } from "../context/budget";
import { BenchmarkRepository } from "../storage/benchmarks";
import { ExecutionRunRepository } from "../storage/runs";
import { TaskRepository } from "../storage/tasks";

export class BenchmarkService {
  constructor(
    private readonly benchmarks: BenchmarkRepository,
    private readonly tasks: TaskRepository,
    private readonly runs: ExecutionRunRepository,
  ) {}

  createCase(input: {
    name: string;
    goal: string;
    repo?: string;
    query?: string;
    note?: string;
  }) {
    const name = input.name.trim();
    const goal = input.goal.trim();
    if (!name) {
      throw new Error("Benchmark case name is required.");
    }
    if (!goal) {
      throw new Error("Benchmark case goal is required.");
    }

    return this.benchmarks.createCase({
      name,
      goal,
      repo: input.repo?.trim() ?? "",
      query: input.query?.trim() ?? "",
      notes: input.note?.trim() ? [input.note.trim()] : [],
    });
  }

  listCases() {
    return this.benchmarks.listCases();
  }

  showCase(caseId: string) {
    const benchmarkCase = this.requireCase(caseId);
    const runs = this.benchmarks.listRunsByCaseId(caseId);

    return {
      benchmarkCase,
      runs,
    };
  }

  captureBaseline(input: {
    caseId: string;
    promptText: string;
    outputText?: string;
    qualityRating?: number | null;
    qualityNote?: string;
    note?: string;
  }) {
    this.requireCase(input.caseId);

    const promptText = input.promptText.trim();
    if (!promptText) {
      throw new Error("Baseline prompt text is required.");
    }

    const outputText = input.outputText?.trim() ?? "";
    const qualityRating = normalizeQualityRating(input.qualityRating);

    return this.benchmarks.createRun({
      benchmarkCaseId: input.caseId,
      variant: "baseline",
      promptText,
      promptTokens: estimateTokens(promptText),
      outputText,
      outputTokens: estimateTokens(outputText),
      totalTokens: estimateTokens(promptText) + estimateTokens(outputText),
      qualityRating,
      qualityNote: input.qualityNote?.trim() ?? "",
      notes: input.note?.trim() ? [input.note.trim()] : [],
    });
  }

  captureThreadzero(input: {
    caseId: string;
    taskId: string;
    qualityRating?: number | null;
    qualityNote?: string;
    note?: string;
  }) {
    this.requireCase(input.caseId);

    const task = this.tasks.getById(input.taskId);
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }

    const run = this.runs.getLatestByTaskId(input.taskId);
    if (!run) {
      throw new Error(`No execution run found for task: ${input.taskId}`);
    }

    const qualityRating = normalizeQualityRating(input.qualityRating);
    const promptTokens = estimateTokens(run.prompt_text);
    const outputTokens = estimateTokens(run.stdout_text);

    return this.benchmarks.createRun({
      benchmarkCaseId: input.caseId,
      variant: "threadzero",
      taskId: task.id,
      executionRunId: run.id,
      promptText: run.prompt_text,
      promptTokens,
      outputText: run.stdout_text,
      outputTokens,
      totalTokens: promptTokens + outputTokens,
      qualityRating,
      qualityNote: input.qualityNote?.trim() ?? "",
      notes: input.note?.trim() ? [input.note.trim()] : [],
    });
  }

  report() {
    const cases = this.benchmarks.listCases();
    const comparisons = cases.map((benchmarkCase) => {
      const baseline = this.benchmarks.getLatestRunByCaseIdAndVariant(
        benchmarkCase.id,
        "baseline",
      );
      const threadzero = this.benchmarks.getLatestRunByCaseIdAndVariant(
        benchmarkCase.id,
        "threadzero",
      );
      const tokenSavings = baseline && threadzero
        ? baseline.total_tokens - threadzero.total_tokens
        : null;
      const tokenSavingsPct = baseline && threadzero && baseline.total_tokens > 0
        ? roundToTwo((tokenSavings! / baseline.total_tokens) * 100)
        : null;
      const qualityDelta = baseline && threadzero &&
          baseline.quality_rating !== null &&
          threadzero.quality_rating !== null
        ? threadzero.quality_rating - baseline.quality_rating
        : null;
      const verdict = baseline && threadzero
        ? tokenSavings! > 0 && (qualityDelta === null || qualityDelta >= 0)
          ? "improved"
          : tokenSavings! === 0 && (qualityDelta === null || qualityDelta >= 0)
          ? "flat"
          : "regressed"
        : "incomplete";

      return {
        benchmarkCase,
        baseline,
        threadzero,
        comparison: {
          tokenSavings,
          tokenSavingsPct,
          qualityDelta,
          verdict,
        },
      };
    });

    const comparable = comparisons.filter((entry) =>
      entry.baseline !== null && entry.threadzero !== null
    );
    const improved = comparable.filter((entry) => entry.comparison.verdict === "improved");
    const accepted = improved.length >= 3;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalCases: cases.length,
        comparableCases: comparable.length,
        improvedCases: improved.length,
        averageTokenSavingsPct: comparable.length
          ? roundToTwo(
              comparable.reduce(
                (sum, entry) => sum + (entry.comparison.tokenSavingsPct ?? 0),
                0,
              ) / comparable.length,
            )
          : null,
      },
      acceptance: {
        status: accepted ? "accepted" : "pending",
        reason: accepted
          ? "At least 3 benchmark cases show lower token use without quality regression."
          : "Need at least 3 benchmark cases with both baseline and threadzero captures showing lower token use without quality regression.",
      },
      cases: comparisons,
    };
  }

  private requireCase(caseId: string) {
    const benchmarkCase = this.benchmarks.getCaseById(caseId);
    if (!benchmarkCase) {
      throw new Error(`Benchmark case not found: ${caseId}`);
    }
    return benchmarkCase;
  }
}

function normalizeQualityRating(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("Quality rating must be an integer between 1 and 5.");
  }
  return value;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

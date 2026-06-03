import { ThreadzeroConfig, ExecutorName } from "../types";
import { BenchmarkRepository } from "../storage/benchmarks";
import { CheckpointRepository } from "../storage/checkpoints";
import { RetrievalRepository } from "../storage/retrieval";
import { ExecutionRunRepository } from "../storage/runs";
import { RouteDecisionRepository } from "../storage/routes";
import { TaskRepository } from "../storage/tasks";
import { BenchmarkService } from "./benchmark";
import { loadGsdState } from "./gsd-state";
import { JCodeMunchClient } from "../retrieval/client";
import { RoutingService } from "./routing";
import { TaskRetrievalService } from "./retrieval";
import { TaskRunService } from "./run";
import { summarizeRun } from "./summarize-run";

export class WorkflowService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly retrievals: RetrievalRepository,
    private readonly checkpoints: CheckpointRepository,
    private readonly runs: ExecutionRunRepository,
    private readonly benchmarks: BenchmarkRepository,
    private readonly routes: RouteDecisionRepository,
    private readonly config: ThreadzeroConfig,
  ) {}

  auto(
    input: {
      goal?: string;
      repo?: string;
      query?: string;
      executor?: ExecutorName;
      effort?: "low" | "medium" | "high" | "xhigh";
      baselinePrompt?: string;
      baselineOutput?: string;
      baselineQuality?: number;
      threadzeroQuality?: number;
      qualityNote?: string;
    },
    cwd = process.cwd(),
  ) {
    const gsdState = loadGsdState(cwd);
    const goal = resolveGoal(input.goal, gsdState, this.config);
    const repo = resolveRepo(input.repo, this.config);
    const query = resolveQuery(input.query, goal, gsdState);
    const createdTask = this.tasks.create({
      goal,
      executor: input.executor ?? this.config.primary_executor,
      currentStep: gsdState?.nextRecommendedAction ?? "",
      metadata: {
        workflow: "auto",
        repo,
        query,
        gsdState,
      },
    });

    const retrievalService = new TaskRetrievalService(this.tasks, this.retrievals);
    const retrieval = this.runRetrievalWithRetry(retrievalService, createdTask.id, repo, query, cwd);
    const routingService = new RoutingService(this.config, this.runs);
    const route = routingService.decide({
      goal,
      query,
      currentPhase: gsdState?.currentPhase ?? "",
      nextStep: gsdState?.nextRecommendedAction ?? "",
      retrieval,
      executorOverride: input.executor,
      effortOverride: input.effort,
    });
    this.tasks.updateExecutor(createdTask.id, route.executor);
    const storedRoute = this.routes.create({
      taskId: createdTask.id,
      category: route.category,
      executor: route.executor,
      effort: route.effort,
      confidence: route.confidence,
      reasons: route.reasons,
      signals: route.signals,
      overrides: route.overrides,
    });

    let runService = new TaskRunService(
      this.tasks,
      this.retrievals,
      this.checkpoints,
      this.runs,
      this.config,
    );

    let execution = runService.run(createdTask.id, cwd, route.effort);
    let activeExecutor = route.executor;
    let activeEffort = route.effort;

    if (
      shouldFallback(execution.result.stderr, execution.result.stdout) &&
      this.config.workflow.fallback_to_secondary &&
      this.config.secondary_executor !== activeExecutor
    ) {
      activeExecutor = this.config.secondary_executor;
      this.tasks.updateExecutor(createdTask.id, activeExecutor);
      activeEffort = raiseForFallback(route.effort);
      this.routes.create({
        taskId: createdTask.id,
        category: route.category,
        executor: activeExecutor,
        effort: activeEffort,
        confidence: 0.92,
        reasons: [
          "fallback triggered by quota or overload signal",
          `switched executor to ${activeExecutor}`,
        ],
        signals: route.signals,
        overrides: { fallback: true },
      });
      execution = runService.run(createdTask.id, cwd, activeEffort);
    }

    const runSummary = summarizeRun(execution.stored);
    const checkpoint = this.config.workflow.auto_checkpoint
      ? this.checkpoints.create({
          taskId: createdTask.id,
          summary: runSummary.summary,
          nextStep: runSummary.nextStep,
          decisions: runSummary.decisions,
          openQuestions: runSummary.openQuestions,
          filesTouched: JSON.parse(createdTask.files_touched_json || "[]"),
        })
      : null;

    const task = this.tasks.getById(createdTask.id);
    if (!task) {
      throw new Error(`Task not found after creation: ${createdTask.id}`);
    }

    let benchmark = null;
    if (
      this.config.benchmarks.enabled &&
      this.config.workflow.auto_benchmark &&
      execution.result.status === "completed" &&
      execution.result.exitCode === 0
    ) {
      const benchmarkService = new BenchmarkService(this.benchmarks, this.tasks, this.runs);
      const benchmarkCase =
        this.benchmarks.findCaseByGoal(goal, repo, query) ??
        benchmarkService.createCase({
          name: compactName(goal, gsdState?.currentPhase ?? ""),
          goal,
          repo,
          query,
          note: "auto-created from workflow auto",
        });

      let baseline = null;
      if (input.baselinePrompt?.trim()) {
        baseline = benchmarkService.captureBaseline({
          caseId: benchmarkCase.id,
          promptText: input.baselinePrompt,
          outputText: input.baselineOutput,
          qualityRating: input.baselineQuality,
          qualityNote: input.qualityNote ?? "auto workflow baseline capture",
          note: "captured during workflow auto",
        });
      }

      const threadzero = benchmarkService.captureThreadzero({
        caseId: benchmarkCase.id,
        taskId: task.id,
        qualityRating: input.threadzeroQuality,
        qualityNote: input.qualityNote ?? "auto workflow threadzero capture",
        note: `captured via ${activeExecutor} (${activeEffort})`,
      });

      benchmark = {
        benchmarkCase,
        baseline,
        threadzero,
        report: benchmarkService.report(),
      };
    }

    return {
      workflow: {
        goal,
        repo,
        query,
        requestedExecutor: input.executor ?? null,
        actualExecutor: activeExecutor,
        actualEffort: activeEffort,
      },
      route: {
        decision: route,
        stored: storedRoute,
      },
      gsdState,
      task,
      retrieval,
      execution,
      checkpoint,
      benchmark,
    };
  }

  private runRetrievalWithRetry(
    retrievalService: TaskRetrievalService,
    taskId: string,
    repo: string,
    query: string,
    cwd: string,
  ) {
    try {
      return retrievalService.run(taskId, repo, query);
    } catch (error) {
      if (!this.config.workflow.auto_index_repo) {
        throw error;
      }

      const client = new JCodeMunchClient(repo);
      client.indexFolder(cwd);
      return retrievalService.run(taskId, repo, query);
    }
  }
}

function resolveGoal(
  explicitGoal: string | undefined,
  gsdState: ReturnType<typeof loadGsdState>,
  config: ThreadzeroConfig,
): string {
  const trimmed = explicitGoal?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (config.workflow.derive_goal_from_gsd_state) {
    const derived = gsdState?.nextRecommendedAction || gsdState?.immediateGoal;
    if (derived) {
      return derived;
    }
  }

  throw new Error("Workflow goal is required. Provide --goal or populate .planning/STATE.md.");
}

function resolveRepo(explicitRepo: string | undefined, config: ThreadzeroConfig): string {
  const repo = explicitRepo?.trim() || config.workflow.default_repo.trim() || config.project_name.trim();
  if (!repo) {
    throw new Error("Workflow repo is required. Provide --repo or set workflow.default_repo.");
  }
  return repo;
}

function resolveQuery(
  explicitQuery: string | undefined,
  goal: string,
  gsdState: ReturnType<typeof loadGsdState>,
): string {
  const trimmed = explicitQuery?.trim();
  if (trimmed) {
    return trimmed;
  }

  return [goal, gsdState?.currentPhase].filter(Boolean).join(" | ");
}

function shouldFallback(stderr: string, stdout: string): boolean {
  const combined = `${stdout}\n${stderr}`;
  return /hit your limit|quota|rate limit|overloaded/i.test(combined);
}

function compactName(goal: string, phase: string): string {
  const label = [phase, goal].filter(Boolean).join(" - ").trim();
  return label.length <= 80 ? label : `${label.slice(0, 77).trim()}...`;
}

function raiseForFallback(effort: "low" | "medium" | "high" | "xhigh"): "medium" | "high" | "xhigh" {
  if (effort === "low") return "medium";
  if (effort === "medium") return "high";
  return "xhigh";
}

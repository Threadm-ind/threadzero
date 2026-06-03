import { packContext } from "../context/packer";
import { runExecutor } from "../executor/runner";
import { ThreadzeroConfig } from "../types";
import { CheckpointRepository } from "../storage/checkpoints";
import { RetrievalRepository } from "../storage/retrieval";
import { ExecutionRunRepository } from "../storage/runs";
import { TaskRepository } from "../storage/tasks";
import { summarizeRun } from "./summarize-run";

export class TaskContinueService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly retrievals: RetrievalRepository,
    private readonly checkpoints: CheckpointRepository,
    private readonly runs: ExecutionRunRepository,
    private readonly config: ThreadzeroConfig,
  ) {}

  continue(taskId: string, cwd = process.cwd(), effort?: "low" | "medium" | "high" | "xhigh") {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const latestRun = this.runs.getLatestByTaskId(taskId);
    if (!latestRun) {
      throw new Error(`No execution run found for task: ${taskId}`);
    }

    const runSummary = summarizeRun(latestRun);

    const checkpoint = this.checkpoints.create({
      taskId,
      summary: runSummary.summary,
      nextStep: runSummary.nextStep,
      decisions: runSummary.decisions,
      openQuestions: runSummary.openQuestions,
      filesTouched: JSON.parse(task.files_touched_json || "[]"),
    });

    const retrievalRow = this.retrievals.getLatestByTaskId(taskId);
    const retrieval = retrievalRow ? JSON.parse(retrievalRow.bundle_json) : null;

    const packed = packContext(
      {
        task,
        retrieval,
        latestCheckpoint: checkpoint,
        budgetTokens: this.config.context.default_budget_tokens,
      },
      "continue",
    );

    const result = runExecutor(task.executor, {
      prompt: packed.prompt,
      cwd,
      effort,
    });

    const storedRun = this.runs.create({
      taskId,
      executor: result.executor,
      promptText: packed.prompt,
      stdoutText: result.stdout,
      stderrText: result.stderr,
      exitCode: result.exitCode,
      status: result.status,
    });

    return {
      checkpoint,
      packed,
      result,
      storedRun,
    };
  }
}

import { runExecutor } from "../executor/runner";
import { ThreadzeroConfig } from "../types";
import { CheckpointRepository } from "../storage/checkpoints";
import { RetrievalRepository } from "../storage/retrieval";
import { ExecutionRunRepository } from "../storage/runs";
import { TaskRepository } from "../storage/tasks";
import { TaskPackService } from "./pack";

export class TaskRunService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly retrievals: RetrievalRepository,
    private readonly checkpoints: CheckpointRepository,
    private readonly runs: ExecutionRunRepository,
    private readonly config: ThreadzeroConfig,
  ) {}

  run(taskId: string, cwd = process.cwd(), effort?: "low" | "medium" | "high" | "xhigh") {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const packer = new TaskPackService(
      this.tasks,
      this.retrievals,
      this.checkpoints,
      this.config,
    );

    const packed = packer.pack(taskId);
    this.tasks.updateStatus(taskId, "in_progress");

    const result = runExecutor(task.executor, {
      prompt: packed.prompt,
      cwd,
      effort,
    });

    const stored = this.runs.create({
      taskId,
      executor: result.executor,
      promptText: packed.prompt,
      stdoutText: result.stdout,
      stderrText: result.stderr,
      exitCode: result.exitCode,
      status: result.status,
    });

    return {
      packed,
      result,
      stored,
    };
  }

  latest(taskId: string) {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.runs.getLatestByTaskId(taskId);
  }
}

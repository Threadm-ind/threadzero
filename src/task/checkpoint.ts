import { CheckpointRepository } from "../storage/checkpoints";
import { TaskRepository } from "../storage/tasks";

export class CheckpointService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly checkpoints: CheckpointRepository,
  ) {}

  create(taskId: string, summary: string) {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const trimmed = summary.trim();
    if (!trimmed) {
      throw new Error("Checkpoint summary is required.");
    }

    return this.checkpoints.create({
      taskId,
      summary: trimmed,
      nextStep: task.current_step,
      filesTouched: JSON.parse(task.files_touched_json),
    });
  }

  list(taskId: string) {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.checkpoints.listByTaskId(taskId);
  }
}

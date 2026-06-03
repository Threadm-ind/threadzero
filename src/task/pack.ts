import { packContext } from "../context/packer";
import { ThreadzeroConfig } from "../types";
import { CheckpointRepository } from "../storage/checkpoints";
import { RetrievalRepository } from "../storage/retrieval";
import { TaskRepository } from "../storage/tasks";

export class TaskPackService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly retrievals: RetrievalRepository,
    private readonly checkpoints: CheckpointRepository,
    private readonly config: ThreadzeroConfig,
  ) {}

  pack(taskId: string) {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const retrieval = this.retrievals.getLatestByTaskId(taskId);
    const latestCheckpoint = this.checkpoints.listByTaskId(taskId)[0] ?? null;

    return packContext({
      task,
      retrieval: retrieval ? JSON.parse(retrieval.bundle_json) : null,
      latestCheckpoint,
      budgetTokens: this.config.context.default_budget_tokens,
    });
  }
}

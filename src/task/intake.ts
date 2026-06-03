import { TaskRepository } from "../storage/tasks";

export class TaskIntakeService {
  constructor(private readonly tasks: TaskRepository) {}

  createTask(goal: string) {
    const trimmed = goal.trim();
    if (!trimmed) {
      throw new Error("Task goal is required.");
    }

    return this.tasks.create({ goal: trimmed });
  }
}

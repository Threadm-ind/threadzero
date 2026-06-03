import { RetrievalBundle } from "../retrieval/types";
import { Checkpoint, Task } from "../types";

export interface PackedContextInput {
  task: Task;
  retrieval: RetrievalBundle | null;
  latestCheckpoint: Checkpoint | null;
  budgetTokens: number;
}

export interface PackedContextSection {
  label: string;
  content: string;
  priority: number;
}

export interface PackedContextResult {
  prompt: string;
  sections: PackedContextSection[];
  estimatedTokens: number;
  truncated: boolean;
}

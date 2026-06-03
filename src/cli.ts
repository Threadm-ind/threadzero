#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";
import { getDb } from "./storage/db";
import { TaskRepository } from "./storage/tasks";
import { CheckpointRepository } from "./storage/checkpoints";
import { RetrievalRepository } from "./storage/retrieval";
import { ExecutionRunRepository } from "./storage/runs";
import { TaskIntakeService } from "./task/intake";
import { CheckpointService } from "./task/checkpoint";
import { TaskRetrievalService } from "./task/retrieval";
import { TaskPackService } from "./task/pack";
import { TaskRunService } from "./task/run";
import { TaskContinueService } from "./task/continue";
import { BenchmarkRepository } from "./storage/benchmarks";
import { RouteDecisionRepository } from "./storage/routes";
import { BenchmarkService } from "./task/benchmark";
import { WorkflowService } from "./task/workflow";

function main(): void {
  const rawArgs = process.argv.slice(2);
  const workspaceCwd = resolveWorkspaceCwd(rawArgs, process.cwd());
  process.chdir(workspaceCwd);

  const config = loadConfig(workspaceCwd);
  const db = getDb(config);

  const tasks = new TaskRepository(db);
  const checkpoints = new CheckpointRepository(db);
  const retrievals = new RetrievalRepository(db);
  const runs = new ExecutionRunRepository(db);
  const benchmarks = new BenchmarkRepository(db);
  const routes = new RouteDecisionRepository(db);
  const intake = new TaskIntakeService(tasks);
  const checkpointService = new CheckpointService(tasks, checkpoints);
  const retrievalService = new TaskRetrievalService(tasks, retrievals);
  const packService = new TaskPackService(tasks, retrievals, checkpoints, config);
  const runService = new TaskRunService(tasks, retrievals, checkpoints, runs, config);
  const continueService = new TaskContinueService(tasks, retrievals, checkpoints, runs, config);
  const benchmarkService = new BenchmarkService(benchmarks, tasks, runs);
  const workflowService = new WorkflowService(
    tasks,
    retrievals,
    checkpoints,
    runs,
    benchmarks,
    routes,
    config,
  );

  const args = stripGlobalFlags(rawArgs);
  const [area, action, ...rest] = args;

  try {
    if (area === "task" && action === "new") {
      print(intake.createTask(rest.join(" ").trim()));
      return;
    }

    if (area === "task" && action === "list") {
      print(tasks.list());
      return;
    }

    if (area === "task" && action === "show") {
      print(tasks.getById(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "task" && action === "checkpoint") {
      print(
        checkpointService.create(
          requiredArg(rest[0], "Task ID"),
          requiredFlag(rest, "--note"),
        ),
      );
      return;
    }

    if (area === "checkpoint" && action === "list") {
      print(checkpointService.list(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "retrieve" && action === "run") {
      print(
        retrievalService.run(
          requiredArg(rest[0], "Task ID"),
          requiredFlag(rest, "--repo"),
          requiredFlag(rest, "--query"),
        ),
      );
      return;
    }

    if (area === "retrieve" && action === "show") {
      print(retrievalService.latest(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "pack" && action === "run") {
      print(packService.pack(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "run" && action === "task") {
      print(runService.run(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "run" && action === "show") {
      print(runService.latest(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "continue" && action === "task") {
      print(continueService.continue(requiredArg(rest[0], "Task ID")));
      return;
    }

    if (area === "benchmark" && action === "case" && rest[0] === "add") {
      print(benchmarkService.createCase({
        name: requiredFlag(rest, "--name"),
        goal: requiredFlag(rest, "--goal"),
        repo: flag(rest, "--repo"),
        query: flag(rest, "--query"),
        note: flag(rest, "--note"),
      }));
      return;
    }

    if (area === "benchmark" && action === "case" && rest[0] === "list") {
      print(benchmarkService.listCases());
      return;
    }

    if (area === "benchmark" && action === "case" && rest[0] === "show") {
      print(benchmarkService.showCase(requiredArg(rest[1], "Benchmark case ID")));
      return;
    }

    if (area === "benchmark" && action === "capture" && rest[0] === "baseline") {
      print(benchmarkService.captureBaseline({
        caseId: requiredArg(rest[1], "Benchmark case ID"),
        promptText: requiredFlag(rest, "--prompt"),
        outputText: flag(rest, "--output"),
        qualityRating: numberFlag(rest, "--quality"),
        qualityNote: flag(rest, "--quality-note"),
        note: flag(rest, "--note"),
      }));
      return;
    }

    if (area === "benchmark" && action === "capture" && rest[0] === "threadzero") {
      print(benchmarkService.captureThreadzero({
        caseId: requiredArg(rest[1], "Benchmark case ID"),
        taskId: requiredFlag(rest, "--task"),
        qualityRating: numberFlag(rest, "--quality"),
        qualityNote: flag(rest, "--quality-note"),
        note: flag(rest, "--note"),
      }));
      return;
    }

    if (area === "benchmark" && action === "report") {
      print(benchmarkService.report());
      return;
    }

    if (area === "workflow" && action === "auto") {
      print(workflowService.auto({
        goal: flag(rest, "--goal"),
        repo: flag(rest, "--repo"),
        query: flag(rest, "--query"),
        executor: enumExecutor(flag(rest, "--executor")),
        effort: enumEffort(flag(rest, "--effort")),
        baselinePrompt: flag(rest, "--baseline-prompt"),
        baselineOutput: flag(rest, "--baseline-output"),
        baselineQuality: numberFlag(rest, "--baseline-quality"),
        threadzeroQuality: numberFlag(rest, "--threadzero-quality"),
        qualityNote: flag(rest, "--quality-note"),
      }));
      return;
    }

    printHelp();
    process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function requiredArg(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function flag(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0) return "";
  const value = args[index + 1];
  return value ? value.trim() : "";
}

function requiredFlag(args: string[], name: string): string {
  const value = flag(args, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function numberFlag(args: string[], name: string): number | undefined {
  const value = flag(args, name);
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a number.`);
  }

  return parsed;
}

function enumExecutor(value: string): "claude-code" | "codex" | undefined {
  if (!value) return undefined;
  if (value === "claude-code" || value === "codex") return value;
  throw new Error(`Unsupported executor: ${value}`);
}

function enumEffort(value: string): "low" | "medium" | "high" | "xhigh" | undefined {
  if (!value) return undefined;
  if (value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  throw new Error(`Unsupported effort: ${value}`);
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp(): void {
  console.log(`
threadzero commands

  threadzero [--cwd <project-dir>] workflow auto
  threadzero [--cwd <project-dir>] workflow auto --goal "<goal>"
  threadzero task new "<goal>"
  threadzero task list
  threadzero task show <task-id>
  threadzero task checkpoint <task-id> --note "<summary>"
  threadzero checkpoint list <task-id>
  threadzero retrieve run <task-id> --repo <repo> --query "<query>"
  threadzero retrieve show <task-id>
  threadzero pack run <task-id>
  threadzero run task <task-id>
  threadzero run show <task-id>
  threadzero continue task <task-id>
  threadzero benchmark case add --name "<name>" --goal "<goal>" [--repo <repo>] [--query "<query>"] [--note "<text>"]
  threadzero benchmark case list
  threadzero benchmark case show <case-id>
  threadzero benchmark capture baseline <case-id> --prompt "<text>" [--output "<text>"] [--quality <1-5>] [--quality-note "<text>"] [--note "<text>"]
  threadzero benchmark capture threadzero <case-id> --task <task-id> [--quality <1-5>] [--quality-note "<text>"] [--note "<text>"]
  threadzero benchmark report
  threadzero workflow auto [--goal "<goal>"] [--repo <repo>] [--query "<query>"] [--executor claude-code|codex] [--effort low|medium|high|xhigh] [--baseline-prompt "<text>"] [--baseline-output "<text>"] [--baseline-quality <1-5>] [--threadzero-quality <1-5>] [--quality-note "<text>"]
`.trim());
}

main();

function stripGlobalFlags(args: string[]): string[] {
  const cleaned: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--cwd") {
      index += 1;
      continue;
    }
    cleaned.push(value);
  }

  return cleaned;
}

function resolveWorkspaceCwd(args: string[], fallbackCwd: string): string {
  const explicit = flag(args, "--cwd");
  if (explicit) {
    return path.resolve(fallbackCwd, explicit);
  }

  return findWorkspaceRoot(fallbackCwd) ?? fallbackCwd;
}

function findWorkspaceRoot(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    if (isWorkspaceRoot(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isWorkspaceRoot(candidate: string): boolean {
  return [
    path.join(candidate, "threadzero.config.json"),
    path.join(candidate, ".planning"),
  ].some((target) => fs.existsSync(target));
}

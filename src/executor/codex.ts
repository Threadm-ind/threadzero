import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ExecutorAdapter, ExecutorRunInput, ExecutorRunResult } from "./types";

export class CodexExecutor implements ExecutorAdapter {
  run(input: ExecutorRunInput): ExecutorRunResult {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "threadzero-codex-"));
    const outputPath = path.join(tempDir, "last-message.txt");
    const promptPath = path.join(tempDir, "prompt.txt");
    fs.writeFileSync(promptPath, input.prompt, "utf8");

    try {
      if (process.platform === "win32") {
        execFileSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            `$prompt = Get-Content -Raw ${quoteForPowerShell(promptPath)}; $prompt | codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox -c model_reasoning_effort=${quoteForPowerShell(input.effort ?? "medium")} -C ${quoteForPowerShell(input.cwd)} -o ${quoteForPowerShell(outputPath)} -`,
          ],
          {
            cwd: input.cwd,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
      } else {
        execFileSync(
          "codex",
          [
            "exec",
            "--skip-git-repo-check",
            "--dangerously-bypass-approvals-and-sandbox",
            "-c",
            `model_reasoning_effort=${input.effort ?? "medium"}`,
            "-C",
            input.cwd,
            "-o",
            outputPath,
            input.prompt,
          ],
          {
            cwd: input.cwd,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
      }

      return {
        executor: "codex",
        stdout: readIfExists(outputPath),
        stderr: "",
        exitCode: 0,
        status: "completed",
      };
    } catch (error: any) {
      return {
        executor: "codex",
        stdout: readIfExists(outputPath) || String(error?.stdout || ""),
        stderr: String(error?.stderr || error?.message || ""),
        exitCode: Number(error?.status || 1),
        status: "failed",
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function quoteForPowerShell(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

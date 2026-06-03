import { execFileSync } from "node:child_process";

export class JCodeMunchClient {
  constructor(private readonly repo: string) {}

  searchSymbols(query: string, maxResults = 8): unknown {
    return this.run("search_symbols", {
      repo: this.repo,
      query,
      max_results: maxResults,
    });
  }

  summarizeModule(filePath: string, maxSymbols = 6): unknown {
    return this.run("summarize_module", {
      repo: this.repo,
      file_path: filePath,
      max_symbols: maxSymbols,
    });
  }

  traceCallPath(query: string): unknown {
    return this.run("trace_call_path", {
      repo: this.repo,
      query,
      max_callers: 8,
      max_callees: 8,
    });
  }

  locateConfig(query: string, maxResults = 8): unknown {
    return this.run("locate_config", {
      repo: this.repo,
      query,
      max_results: maxResults,
    });
  }

  indexFolder(folderPath: string): unknown {
    return this.run("index_folder", {
      path: folderPath,
      incremental: true,
      use_ai_summaries: false,
    });
  }

  private run(toolName: string, payload: Record<string, unknown>): unknown {
    const normalizedPayload = normalizePayload(payload);
    const raw =
      process.platform === "win32"
        ? execFileSync("wsl.exe", ["bash", "-lc", buildWslPythonCommand(toolName, normalizedPayload)], {
            encoding: "utf8",
          })
        : execFileSync("npx", [
            "-y",
            "@modelcontextprotocol/inspector",
            "--cli",
            toolName,
            JSON.stringify(normalizedPayload),
          ], { encoding: "utf8" });

    return JSON.parse(raw);
  }
}

function buildWslPythonCommand(toolName: string, payload: Record<string, unknown>): string {
  const toolMap: Record<string, { module: string; func: string }> = {
    search_symbols: {
      module: "jcodemunch_mcp.tools.search_symbols",
      func: "search_symbols",
    },
    summarize_module: {
      module: "jcodemunch_mcp.tools.summarize_module",
      func: "summarize_module",
    },
    trace_call_path: {
      module: "jcodemunch_mcp.tools.trace_call_path",
      func: "trace_call_path",
    },
    locate_config: {
      module: "jcodemunch_mcp.tools.locate_config",
      func: "locate_config",
    },
    index_folder: {
      module: "jcodemunch_mcp.tools.index_folder",
      func: "index_folder",
    },
  };

  const entry = toolMap[toolName];
  if (!entry) {
    throw new Error(`Unsupported retrieval tool: ${toolName}`);
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const setupCommand = process.env.JCODEMUNCH_WSL_SETUP?.trim();

  return [
    ...(setupCommand ? [setupCommand] : []),
    `python -c 'import base64, json; from ${entry.module} import ${entry.func}; payload = json.loads(base64.b64decode("${payloadB64}").decode("utf-8")); print(json.dumps(${entry.func}(**payload)))'`,
  ].join(" && ");
}

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (process.platform !== "win32") {
    return payload;
  }

  const normalized = { ...payload };
  if (typeof normalized.path === "string") {
    normalized.path = toWslPath(normalized.path);
  }
  return normalized;
}

function toWslPath(value: string): string {
  const match = value.match(/^([A-Za-z]):\\(.*)$/);
  if (!match) {
    return value.replace(/\\/g, "/");
  }

  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, "/");
  return `/mnt/${drive}/${rest}`;
}

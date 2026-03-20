import { execFileSync } from "child_process";

function usage() {
  console.error(
    "Usage: node tools/dev-ports.mjs <check|stop> <port...> [serviceName]",
  );
  process.exit(1);
}

function runCommand(file, args) {
  try {
    return execFileSync(file, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    const stdout = error?.stdout?.toString().trim();
    return stdout || "";
  }
}

function runPowerShell(command) {
  return runCommand("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    command,
  ]);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  values.push(current);
  return values;
}

function getListeningProcessesWindows(port) {
  const output = runPowerShell(
    `$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -ExpandProperty OwningProcess`,
  );

  if (!output) {
    return [];
  }

  const pids = Array.from(
    new Set(
      output
        .split(/\r?\n/)
        .map((line) => Number(line.trim()))
        .filter(Boolean),
    ),
  );

  return pids.map((pid) => {
    const taskInfo = runPowerShell(
      `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p) { $p.ProcessName }`,
    );
    const row = taskInfo
      ? parseCsvLine(`"${taskInfo.split(/\r?\n/)[0] || "unknown"}"`)
      : [];
    return {
      pid,
      name: row[0] || "unknown",
    };
  });
}

function getListeningProcesses(port) {
  if (process.platform === "win32") {
    return getListeningProcessesWindows(port);
  }

  const output = runCommand("lsof", [
    "-nP",
    `-iTCP:${port}`,
    "-sTCP:LISTEN",
    "-Fpc",
  ]);

  if (!output) {
    return [];
  }

  const processes = [];
  let current = {};

  output.split(/\n/).forEach((line) => {
    if (line.startsWith("p")) {
      if (current.pid) {
        processes.push(current);
      }
      current = { pid: Number(line.slice(1)) };
    } else if (line.startsWith("c")) {
      current.name = line.slice(1);
    }
  });

  if (current.pid) {
    processes.push(current);
  }

  return processes;
}

function killProcessWindows(pid) {
  runPowerShell(`Stop-Process -Id ${pid} -Force`);
}

function killProcess(pid) {
  if (process.platform === "win32") {
    killProcessWindows(pid);
    return;
  }

  process.kill(pid, "SIGTERM");
}

const [action, ...args] = process.argv.slice(2);

if (!action) {
  usage();
}

if (action === "check") {
  const [portArg, serviceName = "service"] = args;
  const port = Number(portArg);
  if (!port) {
    usage();
  }

  const listeners = getListeningProcesses(port);
  if (listeners.length === 0) {
    process.exit(0);
  }

  console.error(`Port ${port} is already in use for ${serviceName}.`);
  console.error(
    "Another local dev process is probably still running on that port.",
  );
  listeners.forEach((listener) => {
    console.error(`PID ${listener.pid} (${listener.name}) is listening on ${port}.`);
  });
  console.error("Run `npm run stop:dev` before starting a fresh dev server.");
  process.exit(1);
}

if (action === "stop") {
  const ports = args.map((value) => Number(value)).filter(Boolean);
  if (ports.length === 0) {
    usage();
  }

  const processes = Array.from(
    new Map(
      ports
        .flatMap((port) => getListeningProcesses(port))
        .map((listener) => [listener.pid, listener]),
    ).values(),
  );

  if (processes.length === 0) {
    console.log(`No dev processes found on ports ${ports.join(", ")}.`);
    process.exit(0);
  }

  processes.forEach((listener) => {
    killProcess(listener.pid);
    console.log(`Stopped PID ${listener.pid} (${listener.name}).`);
  });
  process.exit(0);
}

usage();

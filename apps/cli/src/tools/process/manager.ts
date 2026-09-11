import { spawn, ChildProcess } from "node:child_process";

export interface ManagedProcess {
  id: number;
  name: string;
  command: string;
  pid?: number;
  status: "running" | "stopped" | "errored";
  logs: string[];
  child: ChildProcess;
}

class ProcessManager {
  private processes = new Map<number, ManagedProcess>();
  private nextId = 1;

  start(name: string, command: string, cwd: string): ManagedProcess {
    const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/bash";
    const args = process.platform === "win32" ? ["-NoProfile", "-Command", command] : ["-c", command];

    const child = spawn(shell, args, { cwd, env: process.env });
    const id = this.nextId++;
    const proc: ManagedProcess = {
      id,
      name,
      command,
      pid: child.pid,
      status: "running",
      logs: [],
      child,
    };

    const pushLog = (buf: Buffer) => {
      const text = buf.toString();
      proc.logs.push(...text.split("\n").filter(Boolean));
      if (proc.logs.length > 500) proc.logs.splice(0, proc.logs.length - 500);
    };

    child.stdout?.on("data", pushLog);
    child.stderr?.on("data", pushLog);
    child.on("close", (code) => {
      proc.status = code === 0 ? "stopped" : "errored";
    });
    child.on("error", () => {
      proc.status = "errored";
    });

    this.processes.set(id, proc);
    return proc;
  }

  list(): ManagedProcess[] {
    return [...this.processes.values()];
  }

  get(id: number): ManagedProcess | undefined {
    return this.processes.get(id);
  }

  stop(id: number): boolean {
    const proc = this.processes.get(id);
    if (!proc) return false;
    proc.child.kill();
    proc.status = "stopped";
    return true;
  }

  restart(id: number, cwd: string): ManagedProcess | undefined {
    const proc = this.processes.get(id);
    if (!proc) return undefined;
    this.stop(id);
    return this.start(proc.name, proc.command, cwd);
  }
}

export const processManager = new ProcessManager();

type LogCall = [string, string];

const logs: LogCall[] = [];

export const testLog = {
  clear: () => {
    logs.length = 0;
  },
  get: (): ReadonlyArray<LogCall> => [...logs],

  logo: (msg = "") => {
    logs.push(["logo", msg]);
  },
  action: (msg: string) => {
    logs.push(["action", msg]);
  },
  success: (msg: string) => {
    logs.push(["success", msg]);
  },
  info: (msg: string) => {
    logs.push(["info", msg]);
  },
  error: (msg: string) => {
    logs.push(["error", msg]);
  },
  final: (msg: string) => {
    logs.push(["final", msg]);
  },
};

export function getLastLog(): LogCall | undefined {
  return logs[logs.length - 1];
}

export function findLogs(type: string): LogCall[] {
  return logs.filter(([t]) => t === type);
}

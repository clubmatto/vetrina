type LogCall = [string, string];

const logs: LogCall[] = [];

export const testLog = {
  clear: () => {
    logs.length = 0;
  },
  get: (): ReadonlyArray<LogCall> => [...logs],

  logo: (version: string) => {
    logs.push(["logo", version]);
  },
  welcome: () => {
    logs.push(["welcome", ""]);
  },
  section: (msg: string) => {
    logs.push(["section", msg]);
  },
  success: (msg: string) => {
    logs.push(["success", msg]);
  },
  final: (msg: string) => {
    logs.push(["final", msg]);
  },
  summary: (counts: { rules: number; skills: number; commands: number }) => {
    logs.push(["summary", JSON.stringify(counts)]);
  },
};

export function getLastLog(): LogCall | undefined {
  return logs[logs.length - 1];
}

export function findLogs(type: string): LogCall[] {
  return logs.filter(([t]) => t === type);
}

import { SyncChanges } from "./output";

export interface Logger {
  logo: (version: string) => void;
  welcome: () => void;
  section: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
  final: (msg: string) => void;
  summary: (counts: SyncChanges) => void;
}

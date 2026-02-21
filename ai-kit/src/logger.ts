import { SyncStats } from "./output";

export interface Logger {
  logo: (version: string) => void;
  welcome: () => void;
  section: (msg: string) => void;
  success: (msg: string) => void;
  final: (msg: string) => void;
  summary: (counts: SyncStats) => void;
}

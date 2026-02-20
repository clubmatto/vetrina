export interface Logger {
  logo: (version: string) => void;
  action: (msg: string) => void;
  section: (msg: string) => void;
  success: (msg: string) => void;
  final: (msg: string) => void;
}

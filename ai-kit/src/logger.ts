export interface Logger {
  logo: (msg?: string) => void;
  action: (msg: string) => void;
  success: (msg: string) => void;
  info: (msg: string) => void;
  error: (msg: string) => void;
  final: (msg: string) => void;
}

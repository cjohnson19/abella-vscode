import type { Range } from 'vscode';

export interface ErrorInfo {
  range: Range;
  command: string;
  message: string;
}

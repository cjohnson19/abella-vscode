import type { Range } from 'vscode';

export interface Command {
  range: Range;
  command: string;
}

export interface CommandWithOutput extends Command {
  output: string;
}

export interface ErrorInfo {
  range: Range;
  command: string;
  message: string;
}

import type { ParsedPath } from 'path';
import { Position, Range } from 'vscode';
import type { CommandWithOutput, ErrorInfo } from './types';

export class AdelfaState {
  private _commands: CommandWithOutput[] = [];
  private _filePath: ParsedPath | undefined;
  private _fileContent: string | undefined;
  private _errorInfo: ErrorInfo | undefined;
  private _loading = false;
  private _lastSuccessfulPosition: Position = new Position(0, 0);

  get commands(): ReadonlyArray<CommandWithOutput> {
    return this._commands;
  }

  get filePath(): ParsedPath | undefined {
    return this._filePath;
  }

  get fileContent(): string | undefined {
    return this._fileContent;
  }

  get errorInfo(): ErrorInfo | undefined {
    return this._errorInfo;
  }

  get loading(): boolean {
    return this._loading;
  }

  get evaluatedRange(): Range {
    if (this._commands.length === 0) {
      return new Range(new Position(0, 0), new Position(0, 0));
    }
    const firstCommand = this._commands[0];
    const lastCommand = this._commands[this._commands.length - 1];
    if (!firstCommand || !lastCommand) {
      return new Range(new Position(0, 0), new Position(0, 0));
    }
    return new Range(firstCommand.range.start, lastCommand.range.end);
  }

  get lastSuccessfulPosition(): Position {
    return this._lastSuccessfulPosition;
  }

  setFilePath(path: ParsedPath | undefined): void {
    this._filePath = path;
  }

  setFileContent(content: string | undefined): void {
    this._fileContent = content;
  }

  setErrorInfo(error: ErrorInfo | undefined): void {
    this._errorInfo = error;
  }

  setLoading(loading: boolean): void {
    this._loading = loading;
  }

  addCommand(command: CommandWithOutput): void {
    this._commands.push(command);
    this._lastSuccessfulPosition = command.range.end;
  }

  removeLastCommand(): CommandWithOutput | undefined {
    const command = this._commands.pop();
    if (command && this._commands.length > 0) {
      const lastRemainingCommand = this._commands[this._commands.length - 1];
      if (lastRemainingCommand) {
        this._lastSuccessfulPosition = lastRemainingCommand.range.end;
      }
    } else if (this._commands.length === 0) {
      this._lastSuccessfulPosition = new Position(0, 0);
    }
    return command;
  }

  clearCommands(): void {
    this._commands = [];
  }

  getCommandsAfterPosition(position: Position): CommandWithOutput[] {
    return this._commands.filter(c => c.range.start.isAfterOrEqual(position));
  }

  /**
   * Get all commands, including the ones which include `position` in their range.
   */
  getCommandsAfterPositionInclusive(position: Position): CommandWithOutput[] {
    return this._commands.filter(c => c.range.end.isAfter(position));
  }

  getLastCommandBeforePosition(position: Position): CommandWithOutput | undefined {
    const commands = this._commands.filter(c => c.range.end.isBeforeOrEqual(position));
    return commands.length > 0 ? commands[commands.length - 1] : undefined;
  }

  getLineProcessingStatuses(): Map<number, 'fully-processed' | 'partially-processed' | 'error'> {
    const lineStatuses = new Map<number, 'fully-processed' | 'partially-processed' | 'error'>();

    if (this._errorInfo) {
      const { line } = this._errorInfo.range.start;
      for (let errLine = line; errLine <= this._errorInfo.range.end.line; errLine++) {
        lineStatuses.set(errLine, 'error');
      }
    }

    if (this._commands.length === 0) return lineStatuses;

    const {
      // start: { line: startLine },
      end: { line: endLine, character: endChar },
    } = this.evaluatedRange;
    for (let line = 0; line <= endLine; line++) {
      if (lineStatuses.get(line) === 'error') continue;
      if (line === endLine) {
        const finalColumn = this._fileContent?.split('\n').at(line)?.trimEnd().length;
        if (finalColumn && endChar < finalColumn) {
          lineStatuses.set(line, 'partially-processed');
        } else {
          lineStatuses.set(line, 'fully-processed');
        }
      } else if (!lineStatuses.has(line)) {
        lineStatuses.set(line, 'fully-processed');
      }
    }
    return lineStatuses;
  }

  reset(): void {
    this._commands = [];
    this._filePath = undefined;
    this._fileContent = undefined;
    this._errorInfo = undefined;
    this._loading = false;
    this._lastSuccessfulPosition = new Position(0, 0);
  }
}

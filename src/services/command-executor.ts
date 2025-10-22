import type { Command, CommandWithOutput, ErrorInfo } from '../models/types';
import type { AbellaProcessManager } from './abella-process-manager';
import type { AbellaState } from '../models/abella-state';
import { CommandQueue } from './command-queue';
import type { Position } from 'vscode';

export class CommandExecutor {
  private commandQueue: CommandQueue;

  constructor(
    private processManager: AbellaProcessManager,
    private state: AbellaState,
  ) {
    this.commandQueue = new CommandQueue();
  }

  async executeCommands(commands: Command[]): Promise<void> {
    return await this.commandQueue.enqueue({
      type: 'execute',
      commands,
      processor: async () => {
        for (const command of commands) {
          try {
            const output = await this.processManager.sendCommand(command.command);
            const commandWithOutput: CommandWithOutput = {
              ...command,
              output,
            };
            this.state.addCommand(commandWithOutput);
          } catch (error) {
            const errorInfo: ErrorInfo = {
              range: command.range,
              command: command.command,
              message: String(error),
            };
            this.state.setErrorInfo(errorInfo);
            throw error instanceof Error ? error : new Error(String(error));
          }
        }
      },
    });
  }

  async undoLastCommand(): Promise<void> {
    this.state.setLoading(true);
    try {
      const lastCommand = this.state.removeLastCommand();
      if (!lastCommand) {
        return;
      }

      await this.processManager.sendCommand('#back.');
    } finally {
      this.state.setLoading(false);
    }
  }

  async undoCommandsAfterPosition(position: Position): Promise<void> {
    return await this.commandQueue.enqueue({
      type: 'undo',
      position,
      processor: async () => {
        const commandsToUndo = this.state.getCommandsAfterPositionInclusive(position);
        for (let i = 0; i < commandsToUndo.length; i++) {
          await this.undoLastCommand();
        }
      },
    });
  }

  clearQueue(): void {
    this.commandQueue.clear();
  }

  /**
   * Check if commands are currently being processed
   */
  isProcessing(): boolean {
    return this.commandQueue.isProcessing();
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.commandQueue.size();
  }
}

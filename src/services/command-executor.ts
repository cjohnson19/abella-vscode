import type { Command, CommandWithOutput } from '../models/command';
import type { ErrorInfo } from '../models/error-info';
import type { AdelfaProcessManager } from './adelfa-process-manager';
import type { AdelfaState } from '../models/adelfa-state';
import { CommandQueue } from './command-queue';
import type { Position } from 'vscode';

export class CommandExecutor {
  private commandQueue: CommandQueue<void>;

  constructor(
    private processManager: AdelfaProcessManager,
    private state: AdelfaState,
  ) {
    this.commandQueue = new CommandQueue<void>();
  }

  async executeCommands(commands: Command[]): Promise<void> {
    return await this.commandQueue.enqueue({
      type: 'execute',
      commands,
      processor: async () => {
        for (const command of commands) {
          try {
            this.state.addPendingCommand(command.command);

            const output = await this.processManager.sendCommand(command.command);
            const commandWithOutput: CommandWithOutput = {
              ...command,
              output,
            };
            this.state.addCommand(commandWithOutput);
          } catch (error) {
            this.state.removePendingCommand(command.command);

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

      if (lastCommand.command.trimStart().startsWith('Theorem')) {
        await this.processManager.sendCommand('abort.');
      } else {
        await this.processManager.sendCommand('undo.');
      }
    } finally {
      this.state.setLoading(false);
    }
  }

  async undoCommandsAfterPosition(position: Position): Promise<void> {
    return await this.commandQueue.enqueue({
      type: 'undo',
      position,
      processor: async () => {
        const commandsToUndo = this.state.getCommandsAfterPosition(position);
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

import { parse } from 'path';
import {
  Position,
  window,
  workspace,
  type TextEditorSelectionChangeEvent,
  type TextDocumentChangeEvent,
  type Disposable,
} from 'vscode';
import { AdelfaState } from './models/adelfa-state';
import { AdelfaProcessManager } from './services/adelfa-process-manager';
import { CommandParser } from './services/command-parser';
import { CommandExecutor } from './services/command-executor';
import { DecorationManager } from './services/decoration-manager';
import { InfoWebviewProvider } from './ui/info-webview-provider';
import { AdelfaConfig } from './config/adelfa-config';
import { maxPosition } from './util/position';
import { Debouncer } from './util/debounce';
import './util/array';
import type { Command } from './models/command';

export class AdelfaLanguageClient {
  private state: AdelfaState;
  private processManager: AdelfaProcessManager;
  private commandParser: CommandParser;
  private commandExecutor: CommandExecutor;
  private decorationManager: DecorationManager;
  private infoProvider: InfoWebviewProvider;
  private cursorDebouncer: Debouncer;
  private textChangeDebouncer: Debouncer;
  private disposables: Disposable[] = [];
  private isProcessingUpdate = false;

  constructor(grammar: string) {
    // Initialize services
    this.state = new AdelfaState();
    this.processManager = new AdelfaProcessManager(AdelfaConfig.adelfaPath);
    this.commandParser = new CommandParser();
    this.commandExecutor = new CommandExecutor(this.processManager, this.state);
    this.decorationManager = new DecorationManager();
    this.infoProvider = new InfoWebviewProvider(grammar);

    // Initialize debouncers
    this.cursorDebouncer = new Debouncer(100); // 100ms delay for cursor movements
    this.textChangeDebouncer = new Debouncer(300); // 300ms delay for text changes

    // Register text change listener
    this.disposables.push(workspace.onDidChangeTextDocument(this.handleTextChange.bind(this)));

    // Auto-open info panel if configured
    if (AdelfaConfig.autoOpen) {
      this.infoProvider.openPanel();
    }

    // Load file if active editor is Adelfa
    if (window.activeTextEditor?.document.languageId === 'adelfa') {
      this.loadNewFile();
    }
  }

  async dispose(): Promise<void> {
    this.cursorDebouncer.cancel();
    this.textChangeDebouncer.cancel();
    this.commandExecutor.clearQueue();
    await this.processManager.stop();
    this.decorationManager.dispose();
    this.infoProvider.dispose();
    this.state.reset();
    this.disposables.forEach(d => {
      d.dispose();
    });
  }

  async loadNewFile(): Promise<void> {
    const editor = window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'adelfa') {
      return;
    }

    // Reset state and stop existing process
    this.state.reset();
    await this.processManager.stop();

    // Update UI
    this.infoProvider.update({ message: 'Loading file' });

    // Parse file path and start process
    const filePath = parse(editor.document.fileName);
    this.state.setFilePath(filePath);

    try {
      await this.processManager.start(filePath);

      // Set initial file content
      this.state.setFileContent(editor.document.getText());

      // Parse and execute initial commands up to cursor position
      const initialCommands = this.commandParser.getCommandsInRange(
        editor.document,
        new Position(0, 0),
        editor.selection.active,
      );

      await this.fillCommands(initialCommands);
      this.showInfoAtPosition(editor.selection.active);
    } catch (error) {
      window.showErrorMessage(`Failed to start Adelfa: ${error}`);
    }
  }

  updateInfoView(event: TextEditorSelectionChangeEvent): void {
    // Debounce cursor movements to avoid excessive updates
    const debouncedUpdate = this.cursorDebouncer.debounce(async () => {
      if (!this.isProcessingUpdate) {
        this.isProcessingUpdate = true;
        try {
          await this.updateFile();
          const selection = event.selections[event.selections.length - 1];
          this.showInfoAtPosition(selection!.active);
        } finally {
          this.isProcessingUpdate = false;
        }
      }
    });

    debouncedUpdate();
  }

  private handleTextChange(event: TextDocumentChangeEvent): void {
    if (
      event.document.languageId !== 'adelfa' ||
      event.document !== window.activeTextEditor?.document
    ) {
      return;
    }

    // Debounce text changes
    const debouncedUpdate = this.textChangeDebouncer.debounce(async () => {
      if (!this.isProcessingUpdate) {
        this.isProcessingUpdate = true;
        try {
          // Find the earliest change position
          let earliestChangePosition = new Position(event.document.lineCount, 0);
          for (const change of event.contentChanges) {
            if (change.range.start.isBefore(earliestChangePosition)) {
              earliestChangePosition = change.range.start;
            }
          }

          // Invalidate commands after the change position
          await this.undoCommandsUntilPosition(earliestChangePosition);
          this.state.setFileContent(event.document.getText());

          // Re-evaluate up to current cursor position
          await this.updateFile();
        } finally {
          this.isProcessingUpdate = false;
        }
      }
    });

    debouncedUpdate();
  }

  showOutput(): void {
    if (!this.processManager.isRunning()) {
      window.showErrorMessage('Adelfa server is not running');
      return;
    }
    this.infoProvider.openPanel();
  }

  private async updateFile(): Promise<void> {
    const editor = window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'adelfa') {
      return;
    }

    const newCommands = this.commandParser.getCommandsInRange(
      editor.document,
      new Position(0, 0),
      this.getEndCursorPosition(),
    );

    const commandsToFill = newCommands.filter(c =>
      c.range.start.isAfterOrEqual(this.state.evaluatedRange.end),
    );

    await this.fillCommands(commandsToFill);
    this.decorationManager.updateEvaluatedRange(editor, this.state.evaluatedRange);
  }

  private async fillCommands(commands: Command[]): Promise<void> {
    const editor = window.activeTextEditor;

    if (this.state.errorInfo === undefined) {
      this.decorationManager.clearError(editor);
    }

    try {
      await this.commandExecutor.executeCommands(commands);
    } catch {
      // Error is already handled in commandExecutor and stored in state
      if (this.state.errorInfo) {
        this.decorationManager.showError(editor, this.state.errorInfo.range);
      }
    }

    if (editor?.selection.active && editor.document.languageId === 'adelfa') {
      this.showInfoAtPosition(editor.selection.active);
    }
  }

  private async undoCommandsUntilPosition(position: Position): Promise<void> {
    // Clear error if it's after the edit position
    if (this.state.errorInfo?.range.end.isAfter(position)) {
      this.state.setErrorInfo(undefined);
    }

    await this.commandExecutor.undoCommandsAfterPosition(position);
  }

  private showInfoAtPosition(position: Position): void {
    if (this.state.errorInfo?.range.start.isBeforeOrEqual(position)) {
      this.infoProvider.update({
        code: `>> ${this.state.errorInfo.command}\n\n${this.state.errorInfo.message}`,
      });
      return;
    }

    const command = this.state.getLastCommandBeforePosition(position);
    if (command) {
      this.infoProvider.update({
        code: `>> ${command.command}\n\n${command.output}`,
      });
    } else {
      this.infoProvider.update({ message: 'No command found' });
    }
  }

  private getEndCursorPosition(): Position {
    const editor = window.activeTextEditor!;
    return maxPosition(editor.selection.active, editor.selection.anchor);
  }

  /**
   * Get the current webview content for testing purposes
   */
  getWebviewContent(): string | null {
    return this.infoProvider.getCurrentContent();
  }

  /**
   * Check if the webview panel is currently open
   */
  isWebviewOpen(): boolean {
    return this.infoProvider.isPanelOpen();
  }

  /**
   * Check if the extension is currently processing commands
   */
  isProcessing(): boolean {
    return this.isProcessingUpdate || this.commandExecutor.isProcessing();
  }

  /**
   * Get the current processing status for debugging
   */
  getProcessingStatus(): {
    isProcessingUpdate: boolean;
    isProcessingCommands: boolean;
    queueSize: number;
  } {
    return {
      isProcessingUpdate: this.isProcessingUpdate,
      isProcessingCommands: this.commandExecutor.isProcessing(),
      queueSize: this.commandExecutor.getQueueSize(),
    };
  }
}

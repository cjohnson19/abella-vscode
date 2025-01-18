import * as vscode from "vscode";
import { AdelfaRunner } from "./adelfa-runner";

export class AdelfaWatchTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose?: vscode.Event<number> = this.closeEmitter.event;

  private fileWatcher: vscode.FileSystemWatcher | undefined;

  constructor(private fileName: string) {}

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    // At this point we can start using the terminal.
    this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.ath');
    this.fileWatcher.onDidChange(() => this.doBuild());
    this.fileWatcher.onDidCreate(() => this.doBuild());
    this.fileWatcher.onDidDelete(() => this.doBuild());
    this.doBuild();
  }

  close(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }

  private async doBuild(): Promise<void> {
    return new Promise<void>((resolve) => {
      new AdelfaRunner(
        this.fileName,
        this.writeEmitter,
        this.closeEmitter,
        resolve,
      );
    });
  }
}

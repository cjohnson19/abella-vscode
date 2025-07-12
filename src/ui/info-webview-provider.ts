import { ViewColumn, window, type Disposable, type WebviewPanel } from 'vscode';
import { WebviewContent } from './webview-content';

export class InfoWebviewProvider implements Disposable {
  private panel: WebviewPanel | undefined;
  private webviewContent: WebviewContent;
  private currentMessage: { code?: string; message?: string } | undefined;

  constructor(grammar: string) {
    this.webviewContent = new WebviewContent(grammar);
  }

  openPanel(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = window.createWebviewPanel(
      'adelfa',
      'Adelfa Info',
      { viewColumn: ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    this.panel.webview.html = this.webviewContent.getHtml();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  async update(message: { code?: string; message?: string }): Promise<boolean> {
    if (!this.panel) {
      return false;
    }
    this.currentMessage = message;
    return this.panel.webview.postMessage(message);
  }

  getCurrentContent(): string | null {
    if (!this.currentMessage) {
      return null;
    }

    if (this.currentMessage.message) {
      return this.currentMessage.message;
    }

    if (this.currentMessage.code) {
      return this.currentMessage.code;
    }

    return null;
  }

  isPanelOpen(): boolean {
    return this.panel !== undefined;
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;
  }
}

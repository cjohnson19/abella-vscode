import { ViewColumn, window, type Disposable, type WebviewPanel } from 'vscode';
import { WebviewContent } from './webview-content';

interface WebviewMessage {
  command: string;
}

export class InfoWebviewProvider implements Disposable {
  private panel: WebviewPanel | undefined;
  private webviewContent: WebviewContent;
  private currentMessage: { code?: string; message?: string } | undefined;
  private isWebviewReady = false;

  constructor(grammar: string, theme: string) {
    this.webviewContent = new WebviewContent(grammar, theme);
  }

  openPanel(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = window.createWebviewPanel(
      'abella',
      'Abella',
      { viewColumn: ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    this.panel.webview.html = this.webviewContent.getHtml();
    this.isWebviewReady = false;

    this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
      if (message.command === 'ready') {
        this.isWebviewReady = true;
        if (this.currentMessage) {
          this.panel!.webview.postMessage(this.currentMessage);
        }
      }
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.isWebviewReady = false;
    });
  }

  async update(message: { code?: string; message?: string }): Promise<boolean> {
    if (!this.panel) {
      return false;
    }
    this.currentMessage = message;

    if (this.isWebviewReady) {
      return this.panel.webview.postMessage(message);
    }

    return true;
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

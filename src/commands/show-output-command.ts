import { window } from 'vscode';
import type { AbellaLanguageClient } from '../abella-language-client';

export class ShowOutputCommand {
  constructor(private getClient: () => AbellaLanguageClient | undefined) {}

  execute(): void {
    const client = this.getClient();
    if (!client) {
      window.showErrorMessage('Abella server is not running');
      return;
    }
    client.showOutput();
  }
}

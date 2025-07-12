import { window } from 'vscode';
import type { AdelfaLanguageClient } from '../adelfa-language-client';

export class ShowOutputCommand {
  constructor(private getClient: () => AdelfaLanguageClient | undefined) {}

  execute(): void {
    const client = this.getClient();
    if (!client) {
      window.showErrorMessage('Adelfa server is not running');
      return;
    }
    client.showOutput();
  }
}

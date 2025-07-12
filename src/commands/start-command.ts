import { window } from 'vscode';
import { AdelfaLanguageClient } from '../adelfa-language-client';

export class StartCommand {
  constructor(
    private getClient: () => AdelfaLanguageClient | undefined,
    private setClient: (client: AdelfaLanguageClient | undefined) => void,
    private grammar: string,
  ) {}

  execute(): void {
    const client = this.getClient();
    if (client) {
      window.showWarningMessage('Adelfa server already running');
      return;
    }
    this.setClient(new AdelfaLanguageClient(this.grammar));
  }
}

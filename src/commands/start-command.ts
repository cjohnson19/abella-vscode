import { window } from 'vscode';
import { AbellaLanguageClient } from '../abella-language-client';

export class StartCommand {
  constructor(
    private getClient: () => AbellaLanguageClient | undefined,
    private setClient: (client: AbellaLanguageClient | undefined) => void,
    private grammar: string,
  ) {}

  execute(): void {
    const client = this.getClient();
    if (client) {
      window.showWarningMessage('Abella server already running');
      return;
    }
    this.setClient(new AbellaLanguageClient(this.grammar));
  }
}

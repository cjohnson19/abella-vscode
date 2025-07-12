import { AdelfaLanguageClient } from '../adelfa-language-client';

export class RestartCommand {
  constructor(
    private getClient: () => AdelfaLanguageClient | undefined,
    private setClient: (client: AdelfaLanguageClient | undefined) => void,
    private grammar: string,
  ) {}

  async execute(): Promise<void> {
    const client = this.getClient();
    if (client) {
      await client.dispose();
    }
    this.setClient(new AdelfaLanguageClient(this.grammar));
  }
}

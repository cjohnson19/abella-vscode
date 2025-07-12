import type { AdelfaLanguageClient } from '../adelfa-language-client';

export class EndProcessCommand {
  constructor(private getClient: () => AdelfaLanguageClient | undefined) {}

  async execute(): Promise<void> {
    const client = this.getClient();
    if (client) {
      await client.dispose();
    }
  }
}

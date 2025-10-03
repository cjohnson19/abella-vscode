import type { AbellaLanguageClient } from '../abella-language-client';

export class EndProcessCommand {
  constructor(private getClient: () => AbellaLanguageClient | undefined) {}

  async execute(): Promise<void> {
    const client = this.getClient();
    if (client) {
      await client.dispose();
    }
  }
}

import { AbellaLanguageClient } from '../abella-language-client';

export class RestartCommand {
  constructor(
    private getClient: () => AbellaLanguageClient | undefined,
    private setClient: (client: AbellaLanguageClient | undefined) => void,
    private grammar: string,
  ) {}

  async execute(): Promise<void> {
    const client = this.getClient();
    if (client) {
      await client.dispose();
    }
    this.setClient(new AbellaLanguageClient(this.grammar));
  }
}

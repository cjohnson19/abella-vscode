import { workspace } from 'vscode';

export class AbellaConfig {
  private static readonly SECTION = 'abella';

  static get abellaPath(): string {
    return workspace.getConfiguration(this.SECTION).get<string>('path', 'abella');
  }

  static get autoOpen(): boolean {
    return workspace.getConfiguration(this.SECTION).get<boolean>('autoOpen', true);
  }

  static get shikiTheme(): string {
    return workspace.getConfiguration(this.SECTION).get<string>('infoviewTheme', 'monokai');
  }
}

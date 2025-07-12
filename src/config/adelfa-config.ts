import { workspace } from 'vscode';

export class AdelfaConfig {
  private static readonly SECTION = 'adelfa';

  static get adelfaPath(): string {
    return workspace.getConfiguration(this.SECTION).get<string>('path', 'adelfa');
  }

  static get autoOpen(): boolean {
    return workspace.getConfiguration(this.SECTION).get<boolean>('autoOpen', true);
  }
}

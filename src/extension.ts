import * as vscode from 'vscode';
import { AbellaLanguageClient } from './abella-language-client';
import abellaGrammar from '../syntaxes/abella.tmLanguage.json';

let client: AbellaLanguageClient | undefined;
const grammar = JSON.stringify(abellaGrammar);

// Export client for testing purposes
export function getClient(): AbellaLanguageClient | undefined {
  return client;
}

export function activate(context: vscode.ExtensionContext) {
  client = new AbellaLanguageClient(grammar);

  registerEventListeners(context);

  registerCommands(context);

  return {
    getClient: () => client,
  };
}

function registerEventListeners(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
      client?.updateInfoView(e);
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      client?.loadNewFile();
    }),
  );
}

function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('abella.endProcess', async () => {
      if (client) {
        await client.dispose();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.restart', async () => {
      if (client) {
        await client.dispose();
      }
      client = new AbellaLanguageClient(grammar);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.showOutput', () => {
      if (!client) {
        vscode.window.showErrorMessage('Abella server is not running');
        return;
      }
      client.showOutput();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.start', () => {
      if (client) {
        vscode.window.showWarningMessage('Abella server already running');
        return;
      }
      client = new AbellaLanguageClient(grammar);
    }),
  );
}

export function deactivate() {
  client?.dispose();
}

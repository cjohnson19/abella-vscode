import * as vscode from 'vscode';
import { AdelfaLanguageClient } from './adelfa-language-client';
import adelfaGrammar from '../syntaxes/adelfa.tmLanguage.json';

let client: AdelfaLanguageClient | undefined;
const grammar = JSON.stringify(adelfaGrammar);

// Export client for testing purposes
export function getClient(): AdelfaLanguageClient | undefined {
  return client;
}

export function activate(context: vscode.ExtensionContext) {
  client = new AdelfaLanguageClient(grammar);

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
    vscode.commands.registerCommand('adelfa.endProcess', async () => {
      if (client) {
        await client.dispose();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('adelfa.restart', async () => {
      if (client) {
        await client.dispose();
      }
      client = new AdelfaLanguageClient(grammar);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('adelfa.showOutput', () => {
      if (!client) {
        vscode.window.showErrorMessage('Adelfa server is not running');
        return;
      }
      client.showOutput();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('adelfa.start', () => {
      if (client) {
        vscode.window.showWarningMessage('Adelfa server already running');
        return;
      }
      client = new AdelfaLanguageClient(grammar);
    }),
  );
}

export function deactivate() {
  client?.dispose();
}

import * as vscode from 'vscode';
import { AbellaLanguageClient } from './abella-language-client';
import { EndProcessCommand } from './commands/end-process-command';
import { RestartCommand } from './commands/restart-command';
import { ShowOutputCommand } from './commands/show-output-command';
import { StartCommand } from './commands/start-command';
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
  const setClient = (newClient: AbellaLanguageClient | undefined) => {
    client = newClient;
  };

  const endProcessCommand = new EndProcessCommand(getClient);
  const restartCommand = new RestartCommand(getClient, setClient, grammar);
  const showOutputCommand = new ShowOutputCommand(getClient);
  const startCommand = new StartCommand(getClient, setClient, grammar);

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.endProcess', () => {
      endProcessCommand.execute();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.restart', () => {
      restartCommand.execute();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.showOutput', () => {
      showOutputCommand.execute();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('abella.start', () => {
      startCommand.execute();
    }),
  );
}

export function deactivate() {
  client?.dispose();
}

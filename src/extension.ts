import * as vscode from "vscode";
import { AdelfaServer } from "./server";
// import { readFileSync } from "fs";
import adelfaGrammar from "../syntaxes/adelfa.tmLanguage.json";

let server: AdelfaServer | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
  server = new AdelfaServer(context, JSON.stringify(adelfaGrammar));

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(
      (e: vscode.TextEditorSelectionChangeEvent) => {
        server?.updateInfoView(e);
      },
    ),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      (e: vscode.TextEditor | undefined) => {
        server?.loadNewFile();
      },
    ),
  );
}

export function deactivate() {}

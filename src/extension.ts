import { exec } from "child_process";
import { parse } from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "adelfa-vscode.runFile",
    async () => {
      if (!vscode.window.activeTextEditor?.document.fileName.endsWith(".ath")) {
        vscode.window.showErrorMessage("No Adelfa file detected");
        return;
      }
      const fileParts = parse(
        vscode.window.activeTextEditor?.document.fileName || "",
      );
      vscode.window.showInformationMessage(`Running file: ${fileParts.base}`);
      exec(
        `adelfa -i ${fileParts.base}`,
        { cwd: fileParts.dir },
        async (error, stdout, stderr) => {
          if (error) {
            vscode.window.showErrorMessage(
              `Failed to run ${fileParts.base}: ${error.message}`,
            );
            return;
          }
          if (stderr) {
            vscode.window.showErrorMessage(
              `Failed to run ${fileParts.base}: ${stderr}`,
            );
            return;
          }
					const mostRecentResponse = stdout.split(/[^\s]+>>/).slice(-1)[0];
          const outputDoc = await vscode.workspace.openTextDocument({
            content: `>>${mostRecentResponse}`,
          });
          vscode.window.showTextDocument(outputDoc, vscode.ViewColumn.Beside);
        },
      );
    },
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}

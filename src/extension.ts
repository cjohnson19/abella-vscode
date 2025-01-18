import { ChildProcess, exec, spawn } from "child_process";
import { parse } from "path";
import { Readable } from "stream";
import * as vscode from "vscode";
import { AdelfaWatchTerminal } from "./adelfa-terminal";
import { AdelfaServer } from "./server";

type inputOutput = {
  input: string;
  output: string;
};

let server: AdelfaServer | undefined = undefined;

async function provideInput(proc: ChildProcess, str: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Add the event listener
    const cb = function (d: Buffer) {
      vscode.window.showInformationMessage(`Received data: ${d.toString()}`);
      const resStr = d.toString();
      if (resStr.split("\n").some((line) => line.trim().startsWith("ERROR"))) {
        reject();
      } else if (resStr.split("\n").some((line) => line.trim().match(/.*>>/))) {
        // outputs.push({
        //   input: str,
        //   output: resStr,
        // });
      }
      proc.removeListener("data", cb);
      resolve(resStr);
    };
    const stdinStream = new Readable();
    proc.on("data", cb);
    vscode.window.showInformationMessage(`Sending data: ${str}`);
    stdinStream.push(str);
    stdinStream.push(null);
    stdinStream.pipe(proc.stdin!);
  });
}

export function activate(context: vscode.ExtensionContext) {
  vscode.tasks.registerTaskProvider("adelfa", {
    provideTasks: () => {
      return [
        new vscode.Task(
          { type: "adelfa" },
          vscode.TaskScope.Workspace,
          "Adelfa",
          "adelfa",
          new vscode.CustomExecution(async (_def) => {
            return new Promise<vscode.Pseudoterminal>((resolve) => {
              resolve(
                new AdelfaWatchTerminal(
                  vscode.window.activeTextEditor?.document.fileName ?? "",
                ),
              );
            });
          }),
        ),
      ];
    },
    resolveTask(_task: vscode.Task): vscode.Task | undefined {
      return undefined;
    },
  });

  server = new AdelfaServer(context);

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
        server?.loadFile();
      },
    ),
  );
}

export function deactivate() {}

import { ChildProcess, spawn } from "child_process";
import { parse, ParsedPath } from "path";
import {
  ExtensionContext,
  Position,
  Range,
  TextEditorSelectionChangeEvent,
  window,
  workspace,
} from "vscode";
import { InfoProvider } from "./webview";
import "./util/array";
import { maxPosition, minPosition } from "./util/position";

type Command = {
  range: Range;
  command: string;
};

type CommandWithOutput = Command & {
  output: string;
};

const errorDecorationType = window.createTextEditorDecorationType({
  textDecoration: "underline wavy red",
});

export class AdelfaServer {
  private proc: ChildProcess | undefined;
  private filePath: ParsedPath | undefined;
  private infoProvider: InfoProvider;
  private adelfaPath: string;
  private commands: CommandWithOutput[] = [];
  private fileContent: string | undefined;
  private errorRange: Range | undefined;
  private loading = false;

  get evaluatedRange() {
    if (this.commands.length === 0) {
      return new Range(new Position(0, 0), new Position(0, 0));
    }
    return new Range(
      this.commands[0].range.start,
      this.commands.last().range.end,
    );
  }

  constructor(private context: ExtensionContext, private grammar: string) {
    this.adelfaPath = workspace.getConfiguration("adelfa").get("path")!;

    this.infoProvider = new InfoProvider(this.context, grammar);

    if (window.activeTextEditor?.document.languageId === "adelfa") {
      this.loadNewFile();
    }
  }

  clearState() {
    return new Promise<void>((resolve) => {
      this.commands = [];
      this.filePath = undefined;
      this.fileContent = undefined;
      this.errorRange = undefined;
      if (this.proc) {
        window.showInformationMessage("Ending previous adelfa process");
        this.proc.kill();
        this.proc.on("exit", () => {
          this.proc = undefined;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async readOutput(): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      this.proc?.stdout?.on("data", (d) => {
        data += d.toString();
        if (data.includes(">>")) {
          data = data.replace(/.*>>/g, "");
          resolve(data);
        }
      });
      this.proc?.stderr?.on("data", (d) => {
        reject(d.toString());
      });
    });
  }

  private async provideInput(str: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.readOutput().then(resolve).catch(reject);
      this.proc?.stdin?.write(str, (err) => {
        if (err) {
          reject(err);
        }
      });
    });
  }

  private documentRange(): Range {
    if (!window.activeTextEditor) {
      throw new Error("No active text editor found");
    }
    const { document } = window.activeTextEditor;
    return new Range(
      new Position(0, 0),
      new Position(
        document.lineCount!,
        document.lineAt(document.lineCount! - 1).text.length,
      ),
    );
  }

  async loadNewFile() {
    return new Promise(async (resolve) => {
      if (window.activeTextEditor?.document.languageId !== "adelfa") {
        return;
      }
      await this.clearState();
      this.infoProvider.update("Loading...");

      this.filePath = parse(window.activeTextEditor.document.fileName);
      this.proc = spawn(this.adelfaPath, {
        cwd: this.filePath.dir,
        env: process.env,
        shell: true,
        stdio: "pipe",
      });
      this.proc.stdout?.once("data", () => {
        this.fillCommands(this.getCommands(this.documentRange())).then(resolve);
        // this.updateFile().then(resolve);
      });
    });
  }

  private getCommands(range: Range): Command[] {
    const output = [];
    const rangeStart = range.start;
    let input = "";
    let inString = false;
    let startLineRange = range.start.line;
    for (let i = range.start.line; i <= range.end.line; i++) {
      if (input.trim() === "") {
        startLineRange = i;
      }
      if (this.errorRange !== undefined) {
        break;
      }
      const line = window.activeTextEditor?.document.lineAt(i).text!.trimEnd()!;
      const lastColumn =
        i === range.end.line ? range.end.character + 1 : line.length;
      let startChar = 0;
      for (let j = 0; j < lastColumn; j++) {
        if (line[j] === "%") {
          break;
        }
        if (line[j] === undefined) {
          continue;
        }
        input += line[j];
        if (line[j] === '"') {
          inString = !inString;
        }
        if (!inString && line[j] === ".") {
          input = input.trim();
          output.push({
            range: new Range(
              new Position(startLineRange, startChar),
              new Position(i, j),
            ),
            command: input,
          });
          input = "";
          startChar = j + 1;
          startLineRange = i;
        }
      }
    }
    for (let i = 0; i < output.length - 1; i++) {
      if (output[i].range.intersection(output[i + 1].range) !== undefined) {
        console.error(output[i], output[i + 1]);
        throw new Error("Commands overlap");
      }
    }
    return output;
  }

  private async fillCommands(commands: Command[]) {
    if (this.loading) {
      return;
    }
    if (this.errorRange === undefined) {
      window.activeTextEditor?.setDecorations(errorDecorationType, []);
    }
    this.loading = true;
    for (const { range, command } of commands) {
      try {
        const output = await this.provideInput(command + "\x0d");
        this.commands.push({ range, command, output: output.trim() });
      } catch (e) {
        this.commands.push({ range, command, output: `${e}` });
        window.activeTextEditor?.setDecorations(errorDecorationType, [range]);
        this.errorRange = range;
        break;
      } finally {
        this.proc?.stdin?.removeAllListeners();
        this.proc?.stdout?.removeAllListeners();
        this.proc?.stderr?.removeAllListeners();
      }
    }
    if (window.activeTextEditor?.selection.active) {
      this.showInfoAtPosition(window.activeTextEditor?.selection.active);
    }
    this.loading = false;
  }

  private async undoCommandsUntilPosition(p: Position) {
    const commandsToUndo = this.commands.filter((c) =>
      c.range.start.isAfter(p),
    );
    for (let i = 0; i < commandsToUndo.length; i++) {
      await this.undoCommand();
    }
  }

  private async undoCommand() {
    this.loading = true;
    const lastCommand = this.commands.pop();
    if (!lastCommand) {
      return;
    }
    if (lastCommand.command.trimStart().startsWith("Theorem")) {
      await this.provideInput(`abort.\x0d`);
    } else {
      await this.provideInput(`undo.\x0d`);
    }
    this.proc?.stdin?.removeAllListeners();
    this.proc?.stdout?.removeAllListeners();
    this.proc?.stderr?.removeAllListeners();
    this.loading = false;
  }

  private endCursorPosition() {
    return maxPosition(
      window.activeTextEditor?.selection.active!,
      window.activeTextEditor?.selection.anchor!,
    );
  }

  private startCursorPosition() {
    return minPosition(
      window.activeTextEditor?.selection.active!,
      window.activeTextEditor?.selection.anchor!,
    );
  }

  private async updateFile() {
    this.errorRange = undefined;
    if (window.activeTextEditor?.document.getText() !== this.fileContent) {
      await this.undoCommandsUntilPosition(this.startCursorPosition());
      this.fileContent = window.activeTextEditor!.document.getText();
    }
    const newCommands = this.getCommands(
      new Range(new Position(0, 0), this.endCursorPosition()),
    );
    const commandsToFill = newCommands.filter((c) =>
      c.range.start.isAfter(this.evaluatedRange.end),
    );
    await this.fillCommands(commandsToFill);
  }

  private lastCommand(p: Position) {
    return this.commands.filter((c) => c.range.end.isBeforeOrEqual(p)).last();
  }

  updateInfoView(e: TextEditorSelectionChangeEvent) {
    this.updateFile();
    const selection = e.selections[e.selections.length - 1];
    this.showInfoAtPosition(selection.active);
  }

  showInfoAtPosition(p: Position) {
    const command = this.lastCommand(p) ?? { input: "", output: "" };
    this.infoProvider.update(`>> ${command.command}\n\n${command.output}`);
  }
}

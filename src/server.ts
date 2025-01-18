import { ChildProcessWithoutNullStreams, spawn } from "child_process";
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

interface CommandOutput {
  pos: Position;
  input: string;
  output: string;
}

export class AdelfaServer {
  private proc: ChildProcessWithoutNullStreams | undefined;
  private parts: ParsedPath | undefined;
  private infoProvider: InfoProvider;
  private adelfaPath: string;
  private commands: CommandOutput[] = [];
  private fileContent: string | undefined;
  private output = "";

  constructor(private context: ExtensionContext) {
    this.adelfaPath = workspace.getConfiguration("adelfa").get("path")!;

    this.infoProvider = new InfoProvider(this.context);

    if (window.activeTextEditor?.document.fileName) {
      this.loadFile();
    } else {
      window.showErrorMessage("No active adelfa file found");
    }
  }

  clearState() {
    this.commands = [];
    this.output = "";
    if (this.proc) {
      this.proc.kill();
    }
  }

  loadFile() {
    if (!window.activeTextEditor?.document.fileName) {
      window.showErrorMessage("No active adelfa file found");
      return;
    }
    this.infoProvider.update("Loading...");
    this.clearState();
    this.fileContent = window.activeTextEditor.document.getText();
    this.parts = parse(window.activeTextEditor.document.fileName);
    this.proc = spawn(`${this.adelfaPath} -i ${this.parts.base}`, {
      cwd: this.parts.dir,
      env: process.env,
      shell: true,
    });
    this.proc.stdout.on("data", (d) => this.adelfaReader(d));
    this.proc.stderr.on("data", (d) => this.adelfaReader(d));
    this.proc.on("close", () => {
      this.fillCommands();
    });
  }

  private fillCommands() {
    const coms = this.output
      .split(/.*>>/g)
      // Skip the welcome message
      .skip(1)
      // And the goodbye message
      .dropEnd(1)
      .map((command) => command.trim());

    let commandNum = 0;
    const lineNum = window.activeTextEditor?.document.lineCount ?? 0;
    let inString = false;
    for (let i = 0; i < lineNum; i++) {
      let line = window.activeTextEditor?.document.lineAt(i).text!;
      for (let j = 0; j < line.length; j++) {
        if (line[j] === "%") {
          break;
        }
        if (line[j] === '"') {
          inString = !inString;
        }
        if (!inString && line[j] === ".") {
          this.commands.push({
            pos: new Position(i + 1, j + 1),
            input: coms[commandNum],
            output: coms[commandNum],
          });
          commandNum++;
        }
      }
    }
  }

  private adelfaReader(s: Buffer) {
    this.output += s.toString().replace(/\n/g, "\r\n");
    // await this.infoProvider.update(output);
  }

  private lastCommand(p: Position) {
    return this.commands.filter((c) => c.pos.isBeforeOrEqual(p)).last();
  }

  updateInfoView(e: TextEditorSelectionChangeEvent) {
    if (e.textEditor.document.getText() !== this.fileContent) {
      this.loadFile();
    } else {
      const selection = e.selections[e.selections.length - 1];
      const fixedPos = new Position(
        selection.active.line + 1,
        selection.active.character + 1,
      );
      this.infoProvider.update(this.lastCommand(fixedPos)?.output ?? "");
    }
  }
}

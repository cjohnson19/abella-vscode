import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { parse, ParsedPath } from "path";
import * as vscode from "vscode";

export class AdelfaRunner {
  private proc: ChildProcessWithoutNullStreams;
  private parts: ParsedPath;

  constructor(
    private fileName: string,
    private writeEmitter: vscode.EventEmitter<string>,
    private closeEmitter: vscode.EventEmitter<number>,
    private onFinished: () => void,
  ) {
    this.parts = parse(this.fileName);
    this.writeEmitter.fire("Starting adelfa...\r\n");
    this.proc = spawn(`adelfa -i ${this.parts.base}`, {
      cwd: this.parts.dir,
    });

    this.proc.stdout.on("data", (d) => this.adelfaReader(d));
    this.proc.stderr.on("data", (d) => this.adelfaReader(d));
    this.proc.stderr.on("close", () => this.adelfaCloser());
  }

  private adelfaReader(s: Buffer) {
    const output = s.toString().replace(/\n/g, "\r\n");
    this.writeEmitter.fire(output);
  }

  private async adelfaCloser() {
    setTimeout(() => {
      this.closeEmitter.fire(0);
      this.onFinished();
    }, 1000);
  }
}

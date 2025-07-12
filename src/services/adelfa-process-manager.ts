import { spawn, type ChildProcess } from 'child_process';
import type { ParsedPath } from 'path';
import { window } from 'vscode';
import { ProcessCommunicator } from './process-communicator';

export class AdelfaProcessManager {
  private process: ChildProcess | undefined;
  private communicator: ProcessCommunicator | undefined;

  constructor(private adelfaPath: string) {}

  async start(filePath: ParsedPath): Promise<void> {
    if (this.process) {
      throw new Error('Adelfa process is already running');
    }

    this.process = spawn(this.adelfaPath, {
      cwd: filePath.dir,
      env: globalThis.process.env,
      shell: true,
      stdio: 'pipe',
    });

    this.communicator = new ProcessCommunicator(this.process);

    // Wait for the process to be ready
    return new Promise((resolve, reject) => {
      this.process!.stdout?.once('data', () => {
        resolve();
      });

      this.process!.on('error', error => {
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise(resolve => {
      window.showInformationMessage('Ending Adelfa process');
      this.process!.kill();
      this.process!.on('exit', () => {
        this.process = undefined;
        this.communicator = undefined;
        resolve();
      });
    });
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.communicator) {
      throw new Error('Adelfa process is not running');
    }

    const result = await this.communicator.sendCommand(`${command}\x0d`);
    this.communicator.removeAllListeners();
    return result.trim();
  }

  isRunning(): boolean {
    return this.process !== undefined;
  }
}

import { spawn, type ChildProcess } from 'child_process';
import type { ParsedPath } from 'path';
import { window } from 'vscode';

export class AdelfaProcessManager {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private process: ChildProcess | undefined;

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
        resolve();
      });
    });
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.process) {
      throw new Error('Adelfa process is not running');
    }

    const result = await this.readOutput(`${command}\x0d`);
    this.removeAllListeners();
    return result.trim();
  }

  private async readOutput(
    command: string,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      let timeoutId: NodeJS.Timeout | null = null;

      const onData = (chunk: Buffer) => {
        data += chunk.toString();
        if (data.includes('>>')) {
          data = data.replace(/.*>>/g, '');
          cleanup();
          resolve(data);
        }
      };

      const onError = (error: Buffer) => {
        cleanup();
        reject(error.toString());
      };

      const onTimeout = () => {
        cleanup();
        reject(new Error(`Command timed out after ${timeout}ms`));
      };

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.process!.stdout?.removeListener('data', onData);
        this.process!.stderr?.removeListener('data', onError);
      };

      timeoutId = setTimeout(onTimeout, timeout);

      this.process!.stdout?.on('data', onData);
      this.process!.stderr?.on('data', onError);

      this.process!.stdin?.write(command, err => {
        if (err) {
          cleanup();
          reject(err);
        }
      });
    });
  }

  private removeAllListeners(): void {
    this.process?.stdin?.removeAllListeners();
    this.process?.stdout?.removeAllListeners();
    this.process?.stderr?.removeAllListeners();
  }

  isRunning(): boolean {
    return this.process !== undefined;
  }
}

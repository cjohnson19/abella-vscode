import { spawn, type ChildProcess } from 'child_process';
import type { ParsedPath } from 'path';
import { window } from 'vscode';

export class AbellaProcessManager {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private process: ChildProcess | undefined;

  private isError(s: string): boolean {
    return s.toLowerCase().includes('error');
  }

  constructor(private abellaPath: string) {}

  async start(filePath: ParsedPath): Promise<void> {
    if (this.process) {
      throw new Error('Abella process is already running');
    }

    this.process = spawn(this.abellaPath, {
      cwd: filePath.dir,
      env: globalThis.process.env,
      shell: true,
      stdio: 'pipe',
    });

    // Wait for the process to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanup();
        reject(
          new Error(
            `Abella process failed to start. Is '${this.abellaPath}' installed and in your PATH?`,
          ),
        );
      }, 5000);

      this.process!.stdout?.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.process!.on('error', error => {
        clearTimeout(timeout);
        this.cleanup();
        reject(new Error(`Failed to start Abella: ${error.message}`));
      });

      this.process!.on('exit', code => {
        clearTimeout(timeout);
        if (code !== null && code !== 0) {
          this.cleanup();
          reject(new Error(`Abella process exited with code ${code}`));
        }
      });
    });
  }

  private cleanup(): void {
    if (this.process) {
      this.removeAllListeners();
      this.process.kill();
      this.process = undefined;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise(resolve => {
      window.showInformationMessage('Ending Abella process');
      this.process!.kill();
      this.process!.on('exit', () => {
        this.process = undefined;
        resolve();
      });
    });
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.process) {
      throw new Error('Abella process is not running');
    }

    if (!this.process.stdin || this.process.stdin.destroyed) {
      throw new Error('Abella process stdin stream is not available');
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
        if (this.isError(data)) {
          cleanup();
          reject(data);
        } else if (data.includes('<')) {
          data = data.replace(/.*</g, '');
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

      // Check if stdin is still writable before attempting to write
      if (!this.process!.stdin || this.process!.stdin.destroyed) {
        cleanup();
        reject(new Error('Cannot write to Abella process: stdin stream is not available'));
        return;
      }

      this.process!.stdin.write(command, err => {
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

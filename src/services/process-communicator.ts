import type { ChildProcess } from 'child_process';

export class ProcessCommunicator {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(private process: ChildProcess) {}

  async readOutput(timeout: number = this.DEFAULT_TIMEOUT): Promise<string> {
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
        this.process.stdout?.removeListener('data', onData);
        this.process.stderr?.removeListener('data', onError);
      };

      // Set up timeout
      timeoutId = setTimeout(onTimeout, timeout);

      this.process.stdout?.on('data', onData);
      this.process.stderr?.on('data', onError);
    });
  }

  async sendCommand(command: string, timeout?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.readOutput(timeout).then(resolve).catch(reject);
      this.process.stdin?.write(command, err => {
        if (err) {
          reject(err);
        }
      });
    });
  }

  removeAllListeners(): void {
    this.process.stdin?.removeAllListeners();
    this.process.stdout?.removeAllListeners();
    this.process.stderr?.removeAllListeners();
  }
}

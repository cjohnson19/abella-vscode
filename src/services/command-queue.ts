import type { Command } from '../models/command';

export interface QueuedOperation<T = unknown> {
  id: string;
  type: 'execute' | 'undo';
  commands?: Command[];
  position?: unknown;
  processor?: () => Promise<void>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export class CommandQueue<T> {
  private queue: QueuedOperation<T>[] = [];
  private _isProcessing = false;
  private currentOperation: QueuedOperation<T> | null = null;

  async enqueue(operation: Omit<QueuedOperation<T>, 'id' | 'resolve' | 'reject'>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const queuedOp: QueuedOperation<T> = {
        ...operation,
        id,
        resolve,
        reject,
      };

      this.queue.push(queuedOp);
      // Start processing if not already processing
      if (!this._isProcessing) {
        this.processNext();
      }
    });
  }

  async processNext(): Promise<void> {
    if (this._isProcessing || this.queue.length === 0) {
      return;
    }

    this._isProcessing = true;
    this.currentOperation = this.queue.shift()!;

    if (this.currentOperation.processor) {
      try {
        await this.currentOperation.processor();
        this.completeCurrentOperation();
      } catch (error) {
        this.failCurrentOperation(error);
      }
    }
  }

  completeCurrentOperation(result?: T): void {
    if (this.currentOperation) {
      this.currentOperation.resolve(result as T);
      this.currentOperation = null;
      this._isProcessing = false;
      this.processNext();
    }
  }

  failCurrentOperation(error: unknown): void {
    if (this.currentOperation) {
      this.currentOperation.reject(error);
      this.currentOperation = null;
      this._isProcessing = false;
      this.processNext();
    }
  }

  getCurrentOperation(): QueuedOperation<T> | null {
    return this.currentOperation;
  }

  clear(): void {
    this.queue.forEach(op => op.reject(new Error('Queue cleared')));
    this.queue = [];

    if (this.currentOperation) {
      this.currentOperation.reject(new Error('Queue cleared'));
      this.currentOperation = null;
      this._isProcessing = false;
    }
  }

  size(): number {
    return this.queue.length + (this.currentOperation ? 1 : 0);
  }

  isProcessing(): boolean {
    return this._isProcessing;
  }
}

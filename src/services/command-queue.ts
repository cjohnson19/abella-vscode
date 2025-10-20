import type { Command } from '../models/types';

export interface QueuedOperation {
  id: string;
  type: 'execute' | 'undo';
  commands?: Command[];
  position?: unknown;
  processor?: () => Promise<void>;
  resolve: (value: void) => void;
  reject: (reason?: unknown) => void;
}

export class CommandQueue {
  private queue: QueuedOperation[] = [];
  private _isProcessing = false;
  private currentOperation: QueuedOperation | null = null;

  async enqueue(operation: Omit<QueuedOperation, 'id' | 'resolve' | 'reject'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const queuedOp: QueuedOperation = {
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

  completeCurrentOperation(result?: void): void {
    if (this.currentOperation) {
      this.currentOperation.resolve(result);
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

  getCurrentOperation(): QueuedOperation | null {
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

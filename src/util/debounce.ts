export class Debouncer {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(private delay: number) {}

  debounce<T extends (...args: unknown[]) => unknown>(func: T): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        func(...args);
        this.timeoutId = null;
      }, this.delay);
    };
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  isPending(): boolean {
    return this.timeoutId !== null;
  }
}

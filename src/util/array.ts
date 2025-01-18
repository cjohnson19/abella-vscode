declare global {
  interface Array<T> {
    chunk(size: number): T[][];
    skip(num: number): T[];
    dropEnd(num: number): T[];
    last(): T;
  }
}

Array.prototype.chunk = function (size: number) {
  return Array.from({ length: Math.ceil(this.length / size) }, (_, i) =>
    this.slice(i * size, i * size + size),
  );
};

Array.prototype.skip = function (num: number) {
  return this.slice(num);
};

Array.prototype.dropEnd = function (num: number) {
  return this.slice(0, this.length - num);
};

Array.prototype.last = function () {
  return this[this.length - 1];
};

export {};

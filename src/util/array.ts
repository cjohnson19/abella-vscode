import { Option } from "./option";

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

export function zipFirst<T, U>(a1: T[], a2: U[]): [T, Option<U>][] {
  return a1.map((x, i) => [x, a2[i]]);
}

export function zipLongest<T, U>(a1: T[], a2: U[]): [T, U][] {
  const result: [T, U][] = [];
  const len = Math.max(a1.length, a2.length);
  for (let i = 0; i < len; i++) {
    result.push([a1[i], a2[i]]);
  }
  return result;
}

export function firstDifference<T>(a1: T[], a2: T[]): Option<number> {
  const res = zipLongest(a1, a2).findIndex(([x, y]) => x !== y);
  return res === -1 ? undefined : res;
}

export type Option<T> = T | undefined;

export function bind<T, U>(
  value: Option<T>,
  fn: (value: T) => U,
): Option<U> {
  return value === undefined ? undefined : fn(value);
}

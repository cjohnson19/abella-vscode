import { Position } from "vscode";

export function incrementPosition(position: Position): Position {
  return new Position(position.line + 1, position.character + 1);
}

export function maxPosition(a: Position, b: Position): Position {
  return a.isAfter(b) ? a : b;
}

export function minPosition(a: Position, b: Position): Position {
  return a.isBefore(b) ? a : b;
}
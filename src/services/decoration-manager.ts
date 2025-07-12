import { window, type TextEditorDecorationType, type Range, type TextEditor } from 'vscode';

export class DecorationManager {
  private evaluatedRangeDecorationType: TextEditorDecorationType;
  private errorDecorationType: TextEditorDecorationType;

  constructor() {
    this.evaluatedRangeDecorationType = window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 255, 0, 0.05)',
    });

    this.errorDecorationType = window.createTextEditorDecorationType({
      textDecoration: 'underline wavy red',
    });
  }

  updateEvaluatedRange(editor: TextEditor | undefined, range: Range): void {
    if (!editor) {
      return;
    }
    editor.setDecorations(this.evaluatedRangeDecorationType, [range]);
  }

  showError(editor: TextEditor | undefined, range: Range): void {
    if (!editor) {
      return;
    }
    editor.setDecorations(this.errorDecorationType, [range]);
  }

  clearError(editor: TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    editor.setDecorations(this.errorDecorationType, []);
  }

  dispose(): void {
    this.evaluatedRangeDecorationType.dispose();
    this.errorDecorationType.dispose();
  }
}

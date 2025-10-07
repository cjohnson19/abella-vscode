import {
  window,
  Range,
  type TextEditorDecorationType,
  type TextEditor,
  type DecorationOptions,
  OverviewRulerLane,
} from 'vscode';

export class DecorationManager {
  private evaluatedRangeDecorationType: TextEditorDecorationType;
  private errorDecorationType: TextEditorDecorationType;
  private fullyProcessedGutterType: TextEditorDecorationType;
  private partiallyProcessedGutterType: TextEditorDecorationType;
  private errorGutterType: TextEditorDecorationType;

  constructor() {
    this.evaluatedRangeDecorationType = window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 255, 0, 0.05)',
    });

    this.errorDecorationType = window.createTextEditorDecorationType({
      textDecoration: 'underline wavy red',
    });

    this.fullyProcessedGutterType = window.createTextEditorDecorationType({
      overviewRulerColor: 'rgba(76, 175, 80)', // Light green background
      overviewRulerLane: OverviewRulerLane.Center,
      isWholeLine: true,
    });

    this.partiallyProcessedGutterType = window.createTextEditorDecorationType({
      overviewRulerColor: 'rgba(255, 193, 7)', // Light yellow background
      overviewRulerLane: OverviewRulerLane.Center,
      isWholeLine: true,
    });

    this.errorGutterType = window.createTextEditorDecorationType({
      overviewRulerColor: 'rgba(244, 67, 54)', // Light red background
      overviewRulerLane: OverviewRulerLane.Center,
      isWholeLine: true,
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

  updateGutterDecorations(
    editor: TextEditor | undefined,
    lineStatuses: Map<number, 'fully-processed' | 'partially-processed' | 'error'>,
  ): void {
    if (!editor) {
      return;
    }

    const fullyProcessedRanges: DecorationOptions[] = [];
    const partiallyProcessedRanges: DecorationOptions[] = [];
    const errorRanges: DecorationOptions[] = [];

    for (const [lineNumber, status] of lineStatuses) {
      // How do we get until the last char without needing this magic number?
      const range = new Range(lineNumber, 0, lineNumber, 1000000);
      const decoration: DecorationOptions = { range };

      switch (status) {
        case 'fully-processed':
          fullyProcessedRanges.push(decoration);
          break;
        case 'partially-processed':
          partiallyProcessedRanges.push(decoration);
          break;
        case 'error':
          errorRanges.push(decoration);
          break;
      }
    }

    editor.setDecorations(this.fullyProcessedGutterType, fullyProcessedRanges);
    editor.setDecorations(this.partiallyProcessedGutterType, partiallyProcessedRanges);
    editor.setDecorations(this.errorGutterType, errorRanges);
  }

  clearOverviewDecorations(editor: TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    editor.setDecorations(this.fullyProcessedGutterType, []);
    editor.setDecorations(this.partiallyProcessedGutterType, []);
    editor.setDecorations(this.errorGutterType, []);
  }

  dispose(): void {
    this.evaluatedRangeDecorationType.dispose();
    this.errorDecorationType.dispose();
    this.fullyProcessedGutterType.dispose();
    this.partiallyProcessedGutterType.dispose();
    this.errorGutterType.dispose();
  }
}

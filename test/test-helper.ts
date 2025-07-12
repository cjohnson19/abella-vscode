import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import assert from 'node:assert';

export interface CursorPosition {
  line: number;
  character: number;
}

export interface ParsedAdelfaContent {
  content: string;
  cursorPositions: CursorPosition[];
}

export class AdelfaTestHelper {
  private tempDir: string;
  private createdFiles: vscode.Uri[] = [];

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'adelfa-test-' + Date.now());
  }

  /**
   * Parse Adelfa content with cursor markers and return content + cursor positions
   */
  parseAdelfaContent(content: string): ParsedAdelfaContent {
    const lines = content.split('\n');
    const cursorPositions: CursorPosition[] = [];
    let cleanedContent = '';

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (line === undefined) continue;

      // Find all cursor markers in this line
      let processedLine = '';
      let charIndex = 0;

      for (let i = 0; i < line.length; i++) {
        if (line.substring(i, i + 3) === '<|>') {
          cursorPositions.push({
            line: lineIndex,
            character: charIndex,
          });
          i += 2; // Skip the cursor marker (i will be incremented by 1 in the loop)
        } else {
          processedLine += line[i];
          charIndex++;
        }
      }

      cleanedContent += processedLine + '\n';
    }

    return {
      content: cleanedContent.trim(),
      cursorPositions,
    };
  }

  /**
   * Create temporary Adelfa files from content with cursor markers
   */
  async createAdelfaFiles(
    lfContent: string = '',
    athContent: string = '',
  ): Promise<{
    lfFile?: vscode.Uri;
    athFile?: vscode.Uri;
    lfCursors?: CursorPosition[];
    athCursors?: CursorPosition[];
  }> {
    // Ensure temp directory exists
    await fsPromises.mkdir(this.tempDir, { recursive: true });

    const result: {
      lfFile?: vscode.Uri;
      athFile?: vscode.Uri;
      lfCursors?: CursorPosition[];
      athCursors?: CursorPosition[];
    } = {};

    // Create .lf file if content provided
    if (lfContent) {
      const lfParsed = this.parseAdelfaContent(lfContent);
      const lfPath = path.join(this.tempDir, 'test.lf');
      await fsPromises.writeFile(lfPath, lfParsed.content);
      result.lfFile = vscode.Uri.file(lfPath);
      result.lfCursors = lfParsed.cursorPositions;
      this.createdFiles.push(result.lfFile);
    }

    // Create .ath file if content provided
    if (athContent) {
      const athParsed = this.parseAdelfaContent(athContent);
      const athPath = path.join(this.tempDir, 'test.ath');
      await fsPromises.writeFile(athPath, athParsed.content);
      result.athFile = vscode.Uri.file(athPath);
      result.athCursors = athParsed.cursorPositions;
      this.createdFiles.push(result.athFile);
    }

    return result;
  }

  /**
   * Open a file in VSCode and wait for extension activation
   */
  async openFile(
    file: vscode.Uri,
    waitForActivation: boolean = true,
  ): Promise<vscode.TextDocument> {
    const doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);

    if (waitForActivation) {
      // Wait for extension to activate and process the file
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return doc;
  }

  /**
   * Move cursor to a specific position and wait for webview update
   */
  async moveCursorTo(doc: vscode.TextDocument, position: CursorPosition): Promise<void> {
    const editor = await vscode.window.showTextDocument(doc);

    // Ensure the position is within valid bounds
    const line = Math.min(position.line, doc.lineCount - 1);
    const maxCharacter = doc.lineAt(line).text.length;
    const character = Math.min(position.character, maxCharacter);

    const vscodePosition = new vscode.Position(line, character);
    editor.selection = new vscode.Selection(vscodePosition, vscodePosition);

    // Wait for cursor change event to be processed
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Get the current webview content (if available)
   */
  async getWebviewContent(): Promise<string | null> {
    try {
      // Get the extension instance
      const extension = vscode.extensions.getExtension('adelfa-prover.adelfa-vscode');
      if (!extension) {
        return null;
      }

      // Ensure extension is activated
      if (!extension.isActive) {
        await extension.activate();
      }

      // Access the exported getClient function
      const extensionApi = extension.exports;
      if (extensionApi && typeof extensionApi.getClient === 'function') {
        const client = extensionApi.getClient();
        if (client && typeof client.getWebviewContent === 'function') {
          return client.getWebviewContent();
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to get webview content:', error);
      return null;
    }
  }

  /**
   * Wait for the extension to finish processing commands with smart polling
   * @param timeoutMs Maximum time to wait in milliseconds (default: 10000)
   * @param pollIntervalMs How often to check processing status in milliseconds (default: 100)
   */
  async waitForProcessingComplete(
    timeoutMs: number = 10000,
    pollIntervalMs: number = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const extension = vscode.extensions.getExtension('adelfa-prover.adelfa-vscode');
        if (!extension || !extension.isActive) {
          break;
        }

        const extensionApi = extension.exports;
        if (extensionApi && typeof extensionApi.getClient === 'function') {
          const client = extensionApi.getClient();
          if (client && typeof client.isProcessing === 'function') {
            if (!client.isProcessing()) {
              return; // Processing is complete
            }
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        console.warn('Error while waiting for processing:', error);
        break;
      }
    }

    // If we reach here, timeout occurred
    console.warn(`Timeout waiting for processing to complete after ${timeoutMs}ms`);
  }

  /**
   * Wait for webview content to change from a previous state
   * @param previousContent The previous webview content to compare against
   * @param timeoutMs Maximum time to wait in milliseconds (default: 5000)
   * @param pollIntervalMs How often to check for changes in milliseconds (default: 100)
   */
  async waitForWebviewContentChange(
    previousContent: string | null,
    timeoutMs: number = 5000,
    pollIntervalMs: number = 100,
  ): Promise<string | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const currentContent = await this.getWebviewContent();

      // If content has changed, return the new content
      if (currentContent !== previousContent) {
        return currentContent;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Return current content even if it didn't change
    return await this.getWebviewContent();
  }

  /**
   * Wait for webview content to contain specific text
   * @param expectedText The text that should be present in the webview content
   * @param timeoutMs Maximum time to wait in milliseconds (default: 5000)
   * @param pollIntervalMs How often to check for the text in milliseconds (default: 100)
   */
  async waitForWebviewContentToContain(
    expectedText: string,
    timeoutMs: number = 5000,
    pollIntervalMs: number = 100,
  ): Promise<string | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const currentContent = await this.getWebviewContent();

      if (currentContent && currentContent.includes(expectedText)) {
        return currentContent;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Return current content even if it doesn't contain the expected text
    return await this.getWebviewContent();
  }

  /**
   * Test cursor positions in a file and verify expected webview states
   */
  async testCursorPositions(
    doc: vscode.TextDocument,
    cursorPositions: CursorPosition[],
    expectedStates: (string | null)[],
  ): Promise<void> {
    assert.equal(
      cursorPositions.length,
      expectedStates.length,
      'Number of cursor positions must match expected states',
    );

    for (let i = 0; i < cursorPositions.length; i++) {
      const position = cursorPositions[i];
      const expectedState = expectedStates[i];

      if (!position) {
        console.log(`Skipping undefined position at index ${i}`);
        continue;
      }

      console.log(
        `Testing cursor position ${i}: line ${position.line}, character ${position.character}`,
      );

      await this.moveCursorTo(doc, position);

      const currentState = await this.getWebviewContent();

      if (expectedState === null) {
        assert.equal(currentState, null, `Expected no webview content at cursor position ${i}`);
      } else if (expectedState) {
        assert.ok(
          currentState?.includes(expectedState),
          `Expected webview content to include "${expectedState}" at cursor position ${i}, but got: ${currentState}`,
        );
      }
    }
  }

  /**
   * Create a complete test scenario with LF and ATH files
   */
  async createTestScenario(
    lfContent: string,
    athContent: string,
  ): Promise<{
    lfFile: vscode.Uri;
    athFile: vscode.Uri;
    lfCursors: CursorPosition[];
    athCursors: CursorPosition[];
    cleanup: () => Promise<void>;
  }> {
    const files = await this.createAdelfaFiles(lfContent, athContent);

    if (!files.lfFile || !files.athFile) {
      throw new Error('Both LF and ATH files must be provided for complete test scenario');
    }

    return {
      lfFile: files.lfFile,
      athFile: files.athFile,
      lfCursors: files.lfCursors || [],
      athCursors: files.athCursors || [],
      cleanup: () => this.cleanup(),
    };
  }

  /**
   * Clean up temporary files and directory
   */
  async cleanup(): Promise<void> {
    for (const file of this.createdFiles) {
      try {
        await fsPromises.unlink(file.fsPath);
      } catch (error) {
        // Ignore errors when cleaning up
      }
    }

    try {
      await fsPromises.rmdir(this.tempDir);
    } catch (error) {
      // Ignore errors when cleaning up
    }
  }
}

/**
 * Test fixtures for common Adelfa content patterns
 */
export const TestFixtures = {
  basicNat: `nat : type.
z : nat.
s : nat -> nat.`,

  basicList: `nat : type.
z : nat.
s : nat -> nat.

list : type.
nil : list.
cons : {n:nat} {l:list} list.`,

  appendSpec: `nat : type.
z : nat.
s : nat -> nat.

list : type.
nil : list.
cons : {n:nat} {l:list} list.

eq_list : {L1:list}{L2:list}type.
refl_list : {L:list} eq_list L L.

append : {L1:list} {L2:list} {L3:list} type.
append_nil : {L:list} append nil L L.
append_cons : {N:nat} {L1:list} {L2:list} {L3:list} 
              {D:append L1 L2 L3} append (cons N L1) L2 (cons N L3).`,

  lengthSpec: `nat : type.
z : nat.
s : nat -> nat.

list : type.
nil : list.
cons : {n:nat} {l:list} list.

length : {L:list} {N:nat} type.
length_nil : length nil z.
length_cons : {N:nat} {L:list} {M:nat} {D:length L M} length (cons N L) (s M).`,

  simpleTheorem: `Specification "test.lf".

Theorem test<|> : forall x, {x : nat} => {x : nat}.

  intros.<|>`,

  simpleTheoremNoIntros: `Specification "test.lf".

Theorem test<|> : forall x, {x : nat} => {x : nat}.`,

  appendTheorem: `Specification "test.lf".

Theorem app_nil<|> : forall L1 L2 D, {D : append L1 nil L2} =>
  exists R, {R : eq_list L1 L2}.

  induction on 1. intros. case H1.<|>
  % append_cons case.
  apply IH to H6.
  case H7.
  exists refl_list (cons N L5).
  search.
  % append_nil case.
  exists refl_list nil.<|>
  search.`,

  lengthTheorem: `Specification "test.lf".

Theorem length_nonneg<|> : forall L N D, {D : length L N} => {N : nat}.

  induction on 1. intros.<|>
  case H1.<|>
  % Case: length_nil
  search.
  % Case: length_cons
  apply IH to H6.
  search.`,
};

/**
 * Enhanced test utilities for common test patterns
 */
export class TestUtils {
  /**
   * Verify webview content has relevant information for a position
   */
  static verifyWebviewContent(
    content: string | null,
    position: CursorPosition,
    context: string,
    expectedKeywords: string[],
  ): void {
    if (!content) {
      console.log(
        `\n=== Position (${context}): (line ${position.line}, char ${position.character}) ===`,
      );
      console.log('Webview content: null');
      throw new Error(`Expected webview content at ${context}`);
    }

    if (typeof content !== 'string') {
      console.log(
        `\n=== Position (${context}): (line ${position.line}, char ${position.character}) ===`,
      );
      console.log('Webview content:', content);
      throw new Error(`Webview content should be string at ${context}`);
    }

    if (content.length === 0) {
      console.log(
        `\n=== Position (${context}): (line ${position.line}, char ${position.character}) ===`,
      );
      console.log('Webview content: (empty)');
      throw new Error(`Webview content should not be empty at ${context}`);
    }

    const hasRelevantContent = expectedKeywords.some(keyword => content.includes(keyword));
    if (!hasRelevantContent) {
      console.log(
        `\n=== Position (${context}): (line ${position.line}, char ${position.character}) ===`,
      );
      console.log('Webview content:', content);
      console.log('Expected keywords:', expectedKeywords);
      throw new Error(`Webview should contain relevant content at ${context}`);
    }
  }

  /**
   * Test a single cursor position with expected content validation
   */
  static async testCursorPosition(
    testHelper: AdelfaTestHelper,
    doc: vscode.TextDocument,
    position: CursorPosition,
    context: string,
    expectedKeywords: string[],
    timeoutMs: number = 5000,
  ): Promise<string | null> {
    await testHelper.moveCursorTo(doc, position);
    await testHelper.waitForProcessingComplete(timeoutMs);

    const content = await testHelper.getWebviewContent();
    this.verifyWebviewContent(content, position, context, expectedKeywords);

    return content;
  }

  /**
   * Test multiple cursor positions with their expected content
   */
  static async testMultiplePositions(
    testHelper: AdelfaTestHelper,
    doc: vscode.TextDocument,
    positions: CursorPosition[],
    expectedKeywords: string[][],
    timeoutMs: number = 5000,
  ): Promise<string[]> {
    if (positions.length !== expectedKeywords.length) {
      throw new Error('Number of positions must match expected keywords arrays');
    }

    const results: string[] = [];

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const keywords = expectedKeywords[i]!;

      if (!position) {
        console.log(`Skipping undefined position at index ${i}`);
        continue;
      }

      const content = await this.testCursorPosition(
        testHelper,
        doc,
        position,
        `position ${i}`,
        keywords,
        timeoutMs,
      );

      results.push(content || '');
    }

    return results;
  }

  /**
   * Verify extension activation and command registration
   */
  static async verifyExtensionActivation(): Promise<void> {
    const extension = vscode.extensions.getExtension('adelfa-prover.adelfa-vscode');
    if (!extension) {
      throw new Error('Extension not found - make sure the extension is properly built and loaded');
    }

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      'adelfa.endProcess',
      'adelfa.restart',
      'adelfa.showOutput',
      'adelfa.start',
    ];

    for (const command of expectedCommands) {
      if (!commands.includes(command)) {
        throw new Error(`Command ${command} should be registered`);
      }
    }
  }

  /**
   * Verify language contributions
   */
  static async verifyLanguageContributions(): Promise<void> {
    const languages = await vscode.languages.getLanguages();

    if (!languages.includes('adelfa')) {
      throw new Error('Adelfa language should be registered');
    }

    if (!languages.includes('lf')) {
      throw new Error('LF language should be registered');
    }
  }

  /**
   * Get workspace base path for test files
   */
  static getWorkspaceBasePath(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    return workspaceFolder ? workspaceFolder.uri.fsPath : '/Users/chasejohnson/repos/adelfa-vscode';
  }

  /**
   * Open a test file and wait for activation
   */
  static async openTestFile(fileName: string): Promise<vscode.TextDocument> {
    const basePath = this.getWorkspaceBasePath();
    const filePath = path.join(basePath, 'test', 'lists', fileName);

    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);

    // Wait for activation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return doc;
  }
}

/**
 * Helper function to create a test helper instance
 */
export function createTestHelper(): AdelfaTestHelper {
  return new AdelfaTestHelper();
}

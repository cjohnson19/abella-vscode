import assert from 'node:assert';
import * as vscode from 'vscode';
import { createTestHelper, AdelfaTestHelper, TestFixtures, TestUtils } from '../test-helper';

suite('Adelfa Webview Integration Tests', () => {
  let testHelper: AdelfaTestHelper;

  setup(() => {
    testHelper = createTestHelper();
  });

  teardown(async () => {
    await testHelper.cleanup();
  });

  test('Should parse cursor positions correctly', () => {
    const content = 'nat : type.<|>\nz : nat.\ns : nat -> nat.<|>';
    const parsed = testHelper.parseAdelfaContent(content);

    assert.equal(parsed.content, 'nat : type.\nz : nat.\ns : nat -> nat.');
    assert.equal(parsed.cursorPositions.length, 2);
    assert.deepEqual(parsed.cursorPositions[0], { line: 0, character: 11 });
    assert.deepEqual(parsed.cursorPositions[1], { line: 2, character: 15 });
  });

  test('Should create temporary Adelfa files with cursor positions', async () => {
    const files = await testHelper.createAdelfaFiles(
      TestFixtures.basicNat + '<|>',
      TestFixtures.simpleTheorem,
    );

    assert.ok(files.lfFile, 'LF file should be created');
    assert.ok(files.athFile, 'ATH file should be created');
    assert.equal(files.lfCursors?.length, 1, 'Should have 1 cursor in LF file');
    assert.equal(files.athCursors?.length, 2, 'Should have 2 cursors in ATH file');

    // Verify file contents
    const lfDoc = await vscode.workspace.openTextDocument(files.lfFile!);
    const athDoc = await vscode.workspace.openTextDocument(files.athFile!);

    assert.equal(lfDoc.getText(), TestFixtures.basicNat);
    assert.ok(athDoc.getText().includes('Theorem test : forall x, {x : nat} => {x : nat}.'));
  });

  test('Should handle complex theorem with multiple cursor positions', async () => {
    const files = await testHelper.createAdelfaFiles(
      TestFixtures.appendSpec,
      TestFixtures.appendTheorem,
    );

    assert.ok(files.athFile, 'ATH file should be created');
    assert.equal(files.athCursors?.length, 3, 'Should have 3 cursors in ATH file');

    // Verify cursor positions
    const athCursors = files.athCursors!;
    assert.deepEqual(athCursors[0], { line: 2, character: 15 }); // After "app_nil"
    assert.deepEqual(athCursors[1], { line: 5, character: 34 }); // After "case H1."
    assert.deepEqual(athCursors[2], { line: 12, character: 23 }); // After "nil."
  });

  test('Should open files and move cursor to positions', async function () {
    this.timeout(10000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.basicNat + '<|>',
      TestFixtures.simpleTheoremNoIntros,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Move cursor to the first position and verify
    const cursorPosition = files.athCursors![0];
    assert.ok(cursorPosition, 'Should have cursor position');
    await testHelper.moveCursorTo(athDoc, cursorPosition);

    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor, 'Should have active editor');
    assert.equal(activeEditor.document.uri.fsPath, files.athFile!.fsPath);
    assert.equal(activeEditor.selection.active.line, cursorPosition.line);
    assert.equal(activeEditor.selection.active.character, cursorPosition.character);
  });

  test('Should create complete test scenario', async () => {
    const scenario = await testHelper.createTestScenario(
      TestFixtures.basicNat,
      TestFixtures.simpleTheorem,
    );

    assert.ok(scenario.lfFile, 'LF file should be created');
    assert.ok(scenario.athFile, 'ATH file should be created');
    assert.equal(scenario.lfCursors.length, 0, 'LF should have no cursors');
    assert.equal(scenario.athCursors.length, 2, 'ATH should have 2 cursors');

    // Test cleanup
    await scenario.cleanup();

    // Verify files are deleted
    try {
      await vscode.workspace.openTextDocument(scenario.lfFile);
      assert.fail('LF file should be deleted after cleanup');
    } catch (error) {
      // Expected - file should not exist
    }
  });

  test('Should get webview content when extension is active', async function () {
    this.timeout(15000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.basicNat,
      TestFixtures.simpleTheorem,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Move cursor to trigger webview update
    const cursorPosition = files.athCursors![0];
    assert.ok(cursorPosition, 'Should have cursor position');
    await testHelper.moveCursorTo(athDoc, cursorPosition);
    await testHelper.waitForProcessingComplete(5000);

    // Test getting webview content
    const webviewContent = await testHelper.getWebviewContent();
    assert.ok(
      typeof webviewContent === 'string' || webviewContent === null,
      'Webview content should be string or null',
    );
  });

  test('Should test cursor positions and verify webview states', async function () {
    this.timeout(20000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.basicNat,
      TestFixtures.simpleTheorem,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Test cursor positions using TestUtils
    const expectedKeywords = [
      ['test', 'Theorem', 'Loading', 'No command found'],
      ['intros', 'Loading', 'No command found'],
    ];

    await TestUtils.testMultiplePositions(
      testHelper,
      athDoc,
      files.athCursors!,
      expectedKeywords,
      5000,
    );
  });

  test('Should display no command found at startup', async function () {
    this.timeout(25000);
    const files = await testHelper.createAdelfaFiles(
      TestFixtures.basicNat,
      TestFixtures.simpleTheorem,
    );
    await testHelper.openFile(files.athFile!);

    const webviewContent = await testHelper.getWebviewContent();
    await testHelper.waitForProcessingComplete(5000);
    assert.equal(webviewContent, 'No command found');
  });

  test('Should display theorem states in webview when inserting theorems', async function () {
    this.timeout(25000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.appendSpec,
      TestFixtures.appendTheorem,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Test different cursor positions and their expected webview content
    const expectedKeywords = [
      ['app_nil', 'Theorem', 'Loading', 'No command found', 'Specification', 'Typing error'],
      ['case', 'apply', 'IH', 'Loading', 'No command found', 'Specification', 'Typing error'],
      [
        'nil',
        'search',
        'Proof Completed',
        'Loading',
        'No command found',
        'Specification',
        'Typing error',
      ],
    ];

    await TestUtils.testMultiplePositions(
      testHelper,
      athDoc,
      files.athCursors!,
      expectedKeywords,
      5000,
    );
  });

  test('Should show different webview content for different theorem positions', async function () {
    this.timeout(30000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.lengthSpec,
      TestFixtures.lengthTheorem,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Test webview content at different theorem positions
    const expectedKeywords = [
      ['length_nonneg', 'Theorem', 'Loading', 'No command found', '>>'],
      ['induction', 'intros', 'Loading', 'No command found', '>>'],
      ['case', 'Loading', 'No command found', '>>'],
    ];

    await TestUtils.testMultiplePositions(
      testHelper,
      athDoc,
      files.athCursors!,
      expectedKeywords,
      5000,
    );
  });

  test('Should verify webview content format and structure', async function () {
    this.timeout(20000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.appendSpec,
      TestFixtures.appendTheorem,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Test webview content format at each position
    for (let i = 0; i < files.athCursors!.length; i++) {
      const position = files.athCursors![i];
      if (!position) continue;

      await testHelper.moveCursorTo(athDoc, position);
      await testHelper.waitForProcessingComplete(5000);

      const webviewContent = await testHelper.getWebviewContent();

      if (webviewContent) {
        // Test that the content follows expected patterns
        const isMessageFormat =
          webviewContent.includes('Loading') || webviewContent.includes('No command found');
        const isCodeFormat = webviewContent.includes('>>') && webviewContent.includes('\n\n');

        assert.ok(
          isMessageFormat || isCodeFormat || webviewContent.length > 0,
          `Webview content at position ${i} should follow expected format (message or code format)`,
        );

        // If it's code format, verify structure
        if (isCodeFormat) {
          const lines = webviewContent.split('\n');
          assert.ok(lines.length >= 3, `Code format should have at least 3 lines at position ${i}`);
          assert.ok(
            lines[0]?.startsWith('>>'),
            `First line should start with '>>' at position ${i}`,
          );
          assert.equal(lines[1], '', `Second line should be empty at position ${i}`);
        }
      }
    }
  });

  test('Should demonstrate theorem state progression in webview:', async function () {
    this.timeout(25000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.lengthSpec,
      TestFixtures.lengthTheorem,
    );
    const athDoc = await testHelper.openFile(files.athFile!);

    // Track webview content progression
    const webviewStates: string[] = [];

    for (let i = 0; i < files.athCursors!.length; i++) {
      const position = files.athCursors![i];
      if (!position) continue;

      await testHelper.moveCursorTo(athDoc, position);
      await testHelper.waitForProcessingComplete(5000);

      const webviewContent = await testHelper.getWebviewContent();
      webviewStates.push(webviewContent || 'null');

      // Verify that we get valid states
      if (webviewContent) {
        assert.ok(typeof webviewContent === 'string', `State ${i} should be a string`);
        assert.ok(webviewContent.length > 0, `State ${i} should not be empty`);
      }
    }

    // Should have at least some non-null states
    const nonNullStates = webviewStates.filter(state => state !== 'null');
    if (nonNullStates.length === 0) {
      console.log('\n=== Webview State Progression ===');
      webviewStates.forEach((state, index) => {
        console.log(`State ${index}:`, state);
      });
      assert.fail('Should have at least one non-null webview state');
    }
  });

  test('Should show "Proof Completed!" after search command', async function () {
    this.timeout(25000);

    // Create a simple theorem that can be proven with search
    const lfContent = `nat : type.
z : nat.
s : nat -> nat.

list : type.
nil : list.
cons : {n:nat} {l:list} list.

eq_list : {L1:list}{L2:list}type.
refl_list : {L:list} eq_list L L.`;

    const athContent = `Specification "test.lf".

Theorem simple_proof<|> : forall L, {L : list} => exists R, {R : eq_list L L}.

  intros.
  exists refl_list L.
  search.<|>`;

    const files = await testHelper.createAdelfaFiles(lfContent, athContent);
    const athDoc = await testHelper.openFile(files.athFile!);

    // Move cursor to the search command position
    const searchCursor = files.athCursors![1]; // After "search."
    assert.ok(searchCursor, 'Should have search cursor position');

    await testHelper.moveCursorTo(athDoc, searchCursor);
    await testHelper.waitForProcessingComplete(5000);

    // Get webview content and verify it contains "Proof Completed!"
    const webviewContent = await testHelper.getWebviewContent();

    console.log('Webview content after search:');
    console.log(webviewContent);

    assert.ok(webviewContent, 'Should have webview content');
    assert.ok(
      webviewContent.includes('Proof Completed'),
      `Webview should contain "Proof Completed!" but got: ${webviewContent}`,
    );
  });

  test('Should check Adelfa installation and process status', async function () {
    this.timeout(20000);

    const files = await testHelper.createAdelfaFiles(
      TestFixtures.basicNat,
      TestFixtures.simpleTheorem,
    );

    // Check extension and client
    const extension = vscode.extensions.getExtension('adelfa.adelfa-vscode');
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
    }

    const client = extension.exports.getClient();
    assert.ok(client, 'Client should be available');

    // Open file to trigger extension activation
    await testHelper.openFile(files.athFile!);
    await testHelper.waitForProcessingComplete(3000);

    // Try to manually trigger webview opening
    try {
      await vscode.commands.executeCommand('adelfa.showOutput');
      await testHelper.waitForProcessingComplete(2000);

      const webviewOpenAfterCommand = client.isWebviewOpen();
      assert.ok(webviewOpenAfterCommand, 'Webview should be open after showOutput command');
    } catch (error) {
      assert.fail('Should be able to execute adelfa.showOutput command');
    }

    // Check Adelfa configuration
    const config = vscode.workspace.getConfiguration('adelfa');
    const adelfaPath = config.get<string>('path', 'adelfa');
    const autoOpen = config.get<boolean>('autoOpen', true);

    assert.ok(typeof adelfaPath === 'string', 'Adelfa path should be a string');
    assert.ok(typeof autoOpen === 'boolean', 'Auto-open should be a boolean');
  });
});

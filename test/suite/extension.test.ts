import assert from 'node:assert';
import * as vscode from 'vscode';
import { TestUtils } from '../test-helper';

suite('Extension Test Suite', () => {
  test('Extension should activate when opening Adelfa files', async () => {
    // Open LF file to trigger activation
    await TestUtils.openTestFile('lists.lf');

    // Verify extension is active
    const extension = vscode.extensions.getExtension('adelfa.adelfa-vscode');
    assert.ok(extension?.isActive, 'Extension should be active after opening .lf file');
  });

  test('Extension should activate when opening .ath files', async () => {
    // Open ATH file to trigger activation
    await TestUtils.openTestFile('lists.ath');

    // Verify extension is active
    const extension = vscode.extensions.getExtension('adelfa.adelfa-vscode');
    assert.ok(extension?.isActive, 'Extension should be active after opening .ath file');
  });

  test('Extension should register commands after activation', async () => {
    await TestUtils.verifyExtensionActivation();
  });

  test('Extension should contribute languages', async () => {
    await TestUtils.verifyLanguageContributions();
  });
});

# Adelfa VSCode Extension

Warning: This extension is still in development and may not always work as
expected. It's likely you will have to use the `Adelfa: Restart` command at some
point. If you encounter any problems, please open an issue.

## Features

- Provides syntax highlighting for Adelfa theorem and signature files
- Evaluation which follows the cursor
  - Limits evaluation to only changed portions within the file

## Requirements

To use this extension, you need to have the Adelfa proof assistant installed. By
default the extension will try to find `adelfa` within your `$PATH`, but you may
set the `Adelfa: Path` variable to binary's path in your settings to override
this behavior.

To install Adelfa, follow the instructions in the [Adelfa website](https://adelfa-prover.org/download).

## Planned Features

- Auto-completion for Adelfa keywords and identifiers
- Jump to definition
- Hover information

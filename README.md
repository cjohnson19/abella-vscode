# Abella VSCode Extension

Warning: This extension is still in development and may not always work as
expected. It's likely you will have to use the `Abella: Restart` command at some
point. If you encounter any problems, please open an issue.

I am not a developer, maintainer, or any way involved with the Abella team, so
_this extension will not be published to the extension marketplace_.

To install it, you will need to have
[vsce](https://www.npmjs.com/package/@vscode/vsce) installed, clone this
repository, install the dependencies with `npm install`, build the extension
with `vsce package`. You will then have the extension as
`abella-vscode-0.1.1.vsix`. You can then install this by executing the
"Extensions: Install from VSIX..." command.

## Requirements

To use this extension, you need to have the Abella proof assistant installed. By
default the extension will try to find `abella` within your `$PATH`, but you may
set the `Abella: Path` variable to binary's path in your settings to override
this behavior.

To install Abella, follow the instructions in the [Abella
website](https://abella-prover.org/).

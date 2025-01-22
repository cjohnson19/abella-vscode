import {
  Disposable,
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";

export class InfoProvider implements Disposable {
  private panel: WebviewPanel;

  constructor(private context: ExtensionContext, private grammar: string) {
    this.panel = window.createWebviewPanel(
      "adelfa",
      "Adelfa Info",
      { viewColumn: ViewColumn.Two },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );
    this.panel.webview.html = this.getHtml(grammar);
  }

  async update(msg: { code?: string, message?: string }): Promise<boolean> {
    return this.panel.webview.postMessage(msg);
  }

  private getHtml(grammar: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adelfa Info</title>
  <style>
    code {
      background-color: var(--vscode-editor-background);
    }
  </style>
</head>
<body>
  <h1>Adelfa</h1>

  <div id="message">
    <p>Loading</p>
  </div>

  <div id="content">
  </div>

  <script type="module">
    import { createHighlighter } from 'https://esm.sh/shiki@1.27.2';
    const content = document.getElementById("content");
    const message = document.getElementById("message");
    const html = document.getElementsByTagName("html")[0];

    function getVar(name) {
      return window.getComputedStyle(html).getPropertyValue(name);
    }

    const theme = {
      name: 'user-theme',
      colors: {
        "editor.foreground": getVar('--vscode-editor-foreground'),
        "editor.background": getVar('--vscode-editor-background'),
        "editor.selectionHighlightBackground": getVar('--vscode-editor-selectionBackground'),
        "editor.selectionHighlightForeground": getVar('--vscode-editor-selectionForeground'),
        "editor.selectionHighlightBorder": getVar('--vscode-editor-selectionBorder'),
      },
      "semanticHighlighting": true,
      "tokenColors": [
        {
          "scope": [
            "comment",
            "punctuation.definition.comment",
            "string.comment"
          ],
          "settings": {
            "foreground": "#6a737d"
          }
        },
        {
          "scope": [
            "constant",
            "entity.name.constant",
            "variable.other.constant",
            "variable.other.enummember",
            "variable.language"
          ],
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": [
            "entity",
            "entity.name"
          ],
          "settings": {
            "foreground": "#b392f0"
          }
        },
        {
          "scope": "variable.parameter.function",
          "settings": {
            "foreground": "#e1e4e8"
          }
        },
        {
          "scope": "entity.name.tag",
          "settings": {
            "foreground": "#85e89d"
          }
        },
        {
          "scope": "keyword",
          "settings": {
            "foreground": "#f97583"
          }
        },
        {
          "scope": [
            "storage",
            "storage.type"
          ],
          "settings": {
            "foreground": "#f97583"
          }
        },
        {
          "scope": [
            "storage.modifier.package",
            "storage.modifier.import",
            "storage.type.java"
          ],
          "settings": {
            "foreground": "#e1e4e8"
          }
        },
        {
          "scope": [
            "string",
            "punctuation.definition.string",
            "string punctuation.section.embedded source"
          ],
          "settings": {
            "foreground": "#9ecbff"
          }
        },
        {
          "scope": "support",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "meta.property-name",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "variable",
          "settings": {
            "foreground": "#ffab70"
          }
        },
        {
          "scope": "variable.other",
          "settings": {
            "foreground": "#e1e4e8"
          }
        },
        {
          "scope": "invalid.broken",
          "settings": {
            "fontStyle": "italic",
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": "invalid.deprecated",
          "settings": {
            "fontStyle": "italic",
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": "invalid.illegal",
          "settings": {
            "fontStyle": "italic",
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": "invalid.unimplemented",
          "settings": {
            "fontStyle": "italic",
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": "carriage-return",
          "settings": {
            "background": "#f97583",
            "content": "^M",
            "fontStyle": "italic underline",
            "foreground": "#24292e"
          }
        },
        {
          "scope": "message.error",
          "settings": {
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": "string variable",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": [
            "source.regexp",
            "string.regexp"
          ],
          "settings": {
            "foreground": "#dbedff"
          }
        },
        {
          "scope": [
            "string.regexp.character-class",
            "string.regexp constant.character.escape",
            "string.regexp source.ruby.embedded",
            "string.regexp string.regexp.arbitrary-repitition"
          ],
          "settings": {
            "foreground": "#dbedff"
          }
        },
        {
          "scope": "string.regexp constant.character.escape",
          "settings": {
            "fontStyle": "bold",
            "foreground": "#85e89d"
          }
        },
        {
          "scope": "support.constant",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "support.variable",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "meta.module-reference",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "punctuation.definition.list.begin.markdown",
          "settings": {
            "foreground": "#ffab70"
          }
        },
        {
          "scope": [
            "markup.heading",
            "markup.heading entity.name"
          ],
          "settings": {
            "fontStyle": "bold",
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "markup.quote",
          "settings": {
            "foreground": "#85e89d"
          }
        },
        {
          "scope": "markup.italic",
          "settings": {
            "fontStyle": "italic",
            "foreground": "#e1e4e8"
          }
        },
        {
          "scope": "markup.bold",
          "settings": {
            "fontStyle": "bold",
            "foreground": "#e1e4e8"
          }
        },
        {
          "scope": [
            "markup.underline"
          ],
          "settings": {
            "fontStyle": "underline"
          }
        },
        {
          "scope": [
            "markup.strikethrough"
          ],
          "settings": {
            "fontStyle": "strikethrough"
          }
        },
        {
          "scope": "markup.inline.raw",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": [
            "markup.deleted",
            "meta.diff.header.from-file",
            "punctuation.definition.deleted"
          ],
          "settings": {
            "background": "#86181d",
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": [
            "markup.inserted",
            "meta.diff.header.to-file",
            "punctuation.definition.inserted"
          ],
          "settings": {
            "background": "#144620",
            "foreground": "#85e89d"
          }
        },
        {
          "scope": [
            "markup.changed",
            "punctuation.definition.changed"
          ],
          "settings": {
            "background": "#c24e00",
            "foreground": "#ffab70"
          }
        },
        {
          "scope": [
            "markup.ignored",
            "markup.untracked"
          ],
          "settings": {
            "background": "#79b8ff",
            "foreground": "#2f363d"
          }
        },
        {
          "scope": "meta.diff.range",
          "settings": {
            "fontStyle": "bold",
            "foreground": "#b392f0"
          }
        },
        {
          "scope": "meta.diff.header",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "meta.separator",
          "settings": {
            "fontStyle": "bold",
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": "meta.output",
          "settings": {
            "foreground": "#79b8ff"
          }
        },
        {
          "scope": [
            "brackethighlighter.tag",
            "brackethighlighter.curly",
            "brackethighlighter.round",
            "brackethighlighter.square",
            "brackethighlighter.angle",
            "brackethighlighter.quote"
          ],
          "settings": {
            "foreground": "#d1d5da"
          }
        },
        {
          "scope": "brackethighlighter.unmatched",
          "settings": {
            "foreground": "#fdaeb7"
          }
        },
        {
          "scope": [
            "constant.other.reference.link",
            "string.other.link"
          ],
          "settings": {
            "fontStyle": "underline",
            "foreground": "#dbedff"
          }
        }
      ],
      "type": "dark"
    }

    const highlighter = await createHighlighter({
      langs: [${grammar}],
      themes: [theme]
    });

    window.addEventListener("message", async (event) => {
      message.innerHTML = event.data.message ? \`<p>\${event.data.message}<p>\` : "";
      content.innerHTML = event.data.code ? highlighter.codeToHtml(event.data.code, {
        lang: "adelfa",
        theme: "user-theme"
      }) : "";
    });
  </script>
</body>
</html>`;
  }

  dispose() {
    this.panel.dispose();
  }
}

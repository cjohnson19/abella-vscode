import {
  Disposable,
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";

export class InfoProvider implements Disposable {
  private panel: WebviewPanel;
  private content: string;

  constructor(private context: ExtensionContext) {
    this.panel = window.createWebviewPanel(
      "adelfa",
      "Adelfa Info",
      { viewColumn: ViewColumn.Two },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );
    this.content = "";
    this.panel.webview.html = this.getHtml("Loading...");
    window.showInformationMessage("Adelfa Info panel created");
  }

  async update(content: string): Promise<boolean> {
    return this.panel.webview.postMessage({ content });
  }

  private getHtml(content: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adelfa Info</title>
</head>
<body>
  <h1>Adelfa</h1>

  <pre id="content">${content}</pre>

  <script>
    window.addEventListener("message", (event) => {
      document.getElementById("content").textContent = event.data.content;
    });
  </script>
</body>
</html>`;
  }

  dispose() {
    this.panel.dispose();
  }
}

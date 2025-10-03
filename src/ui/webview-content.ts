export class WebviewContent {
  constructor(
    private grammar: string,
    private theme: string,
  ) {}

  getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abella</title>
  <style>
    code {
      background-color: var(--vscode-editor-background);
    }
  </style>
</head>
<body>
  <h1>Abella</h1>

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

    const highlighter = await createHighlighter({
      langs: [${this.grammar}],
      themes: ['${this.theme}']
    });

    window.addEventListener("message", async (event) => {
      message.innerHTML = event.data.message ? \`<p>\${event.data.message}<p>\` : "";
      content.innerHTML = event.data.code ? highlighter.codeToHtml(event.data.code, {
        lang: "abella",
        theme: "${this.theme}"
      }) : "";
    });
    content.scrollIntoView({ behavior: "smooth", block: "end" });
    const vscode = acquireVsCodeApi();
    
    // Send ready message only after highlighter is fully loaded
    vscode.postMessage({ command: 'ready' });
  </script>
</body>
</html>`;
  }
}

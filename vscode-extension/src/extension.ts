import * as vscode from 'vscode';

let outputPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Learning Copilot extension activated');

  // Command: Explain Selection (Normal mode)
  context.subscriptions.push(
    vscode.commands.registerCommand('learningCopilot.explain', () => {
      handleExplain('normal');
    })
  );

  // Command: Explain Selection (Research mode with citations)
  context.subscriptions.push(
    vscode.commands.registerCommand('learningCopilot.explainResearch', () => {
      handleExplain('agent');
    })
  );

  // Command: Quiz Me
  context.subscriptions.push(
    vscode.commands.registerCommand('learningCopilot.quiz', () => {
      handleQuiz();
    })
  );
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('learningCopilot');
  return {
    apiUrl: config.get<string>('apiUrl', 'http://localhost:3000'),
    level: config.get<string>('level', 'Beginner'),
  };
}

function getSelectedText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return undefined;
  }

  const selection = editor.selection;
  const text = editor.document.getText(selection);

  if (!text.trim()) {
    vscode.window.showWarningMessage('No text selected. Highlight code or text first.');
    return undefined;
  }

  return text;
}

async function handleExplain(mode: 'normal' | 'agent') {
  const text = getSelectedText();
  if (!text) return;

  const { apiUrl, level } = getConfig();
  const panel = getOrCreatePanel();

  panel.webview.html = getLoadingHtml(text, mode);

  try {
    const response = await fetch(`${apiUrl}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, level, mode, userId: 'vscode' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResult = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullResult += decoder.decode(value);
      panel.webview.html = getResultHtml(text, fullResult, mode);
    }
  } catch (error: any) {
    panel.webview.html = getErrorHtml(error.message);
    vscode.window.showErrorMessage(`Learning Copilot: ${error.message}`);
  }
}

async function handleQuiz() {
  const text = getSelectedText();
  if (!text) return;

  const { apiUrl, level } = getConfig();

  // First get explanation, then generate quiz
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating quiz...',
      cancellable: false,
    },
    async () => {
      try {
        const res = await fetch(`${apiUrl}/api/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, level }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: any = await res.json();
        const panel = getOrCreatePanel();
        panel.webview.html = getQuizHtml(data.quiz);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Quiz generation failed: ${error.message}`);
      }
    }
  );
}

function getOrCreatePanel(): vscode.WebviewPanel {
  if (outputPanel) {
    outputPanel.reveal(vscode.ViewColumn.Beside);
    return outputPanel;
  }

  outputPanel = vscode.window.createWebviewPanel(
    'learningCopilot',
    'Learning Copilot',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  outputPanel.onDidDispose(() => {
    outputPanel = undefined;
  });

  return outputPanel;
}

function getLoadingHtml(text: string, mode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 20px; }
    .loader { display: flex; align-items: center; gap: 8px; margin: 20px 0; }
    .spinner { width: 20px; height: 20px; border: 2px solid var(--vscode-editorWidget-border); border-top-color: var(--vscode-focusBorder); border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .query { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-focusBorder); padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 13px; max-height: 100px; overflow: hidden; }
    .mode { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  </style>
</head>
<body>
  <span class="mode">${mode === 'agent' ? 'Research Mode' : 'Normal Mode'}</span>
  <div class="query"><pre>${escapeHtml(text.substring(0, 300))}${text.length > 300 ? '...' : ''}</pre></div>
  <div class="loader"><div class="spinner"></div><span>Generating explanation...</span></div>
</body>
</html>`;
}

function getResultHtml(query: string, markdown: string, mode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 20px; line-height: 1.6; }
    .mode { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); margin-bottom: 12px; }
    .query { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-focusBorder); padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 13px; max-height: 80px; overflow: hidden; }
    .result { font-size: 14px; white-space: pre-wrap; word-wrap: break-word; }
    pre { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 4px; overflow-x: auto; }
    code { font-family: var(--vscode-editor-font-family); font-size: 13px; }
    h1, h2, h3 { color: var(--vscode-foreground); margin-top: 16px; }
    a { color: var(--vscode-textLink-foreground); }
    .citation { display: inline-block; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 0 5px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: none; }
  </style>
</head>
<body>
  <span class="mode">${mode === 'agent' ? 'Research Mode' : 'Normal Mode'}</span>
  <div class="query"><pre>${escapeHtml(query.substring(0, 200))}${query.length > 200 ? '...' : ''}</pre></div>
  <div class="result">${escapeHtml(markdown)}</div>
</body>
</html>`;
}

function getErrorHtml(errorMsg: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 20px; }
    .error { background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); padding: 12px; border-radius: 4px; color: var(--vscode-errorForeground); }
    .hint { margin-top: 12px; font-size: 13px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div class="error">Error: ${escapeHtml(errorMsg)}</div>
  <div class="hint">Make sure the Learning Copilot server is running (npm run dev) and check the API URL in settings.</div>
</body>
</html>`;
}

function getQuizHtml(quiz: any): string {
  if (!quiz || !quiz.questions) {
    return getErrorHtml('Failed to generate quiz');
  }

  const questionsHtml = quiz.questions.map((q: any, i: number) => `
    <div class="question">
      <p class="q-text"><strong>Q${i + 1}.</strong> ${escapeHtml(q.question)}</p>
      <div class="options">
        ${q.options.map((opt: string, j: number) => `
          <label class="option">
            <input type="radio" name="q${i}" value="${j}" onchange="checkAnswer(${i}, ${j}, ${q.correctIndex})">
            <span>${escapeHtml(opt)}</span>
          </label>
        `).join('')}
      </div>
      <div class="feedback" id="fb${i}"></div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 20px; }
    h2 { color: var(--vscode-foreground); }
    .question { margin-bottom: 24px; padding: 12px; background: var(--vscode-textBlockQuote-background); border-radius: 6px; }
    .q-text { margin-bottom: 8px; font-size: 14px; }
    .options { display: flex; flex-direction: column; gap: 6px; }
    .option { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .option:hover { background: var(--vscode-list-hoverBackground); }
    .feedback { margin-top: 8px; font-size: 13px; padding: 6px 8px; border-radius: 4px; display: none; }
    .correct { background: rgba(40, 167, 69, 0.2); color: #28a745; display: block; }
    .incorrect { background: rgba(220, 53, 69, 0.2); color: #dc3545; display: block; }
  </style>
</head>
<body>
  <h2>Quiz: ${escapeHtml(quiz.topic || 'Test Your Knowledge')}</h2>
  ${questionsHtml}
  <script>
    function checkAnswer(qIndex, selected, correct) {
      const fb = document.getElementById('fb' + qIndex);
      if (selected === correct) {
        fb.className = 'feedback correct';
        fb.textContent = 'Correct!';
      } else {
        fb.className = 'feedback incorrect';
        fb.textContent = 'Incorrect. Try again!';
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function deactivate() {
  outputPanel?.dispose();
}

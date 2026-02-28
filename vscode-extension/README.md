# Learning Copilot — VS Code Extension

AI-powered learning assistant for VS Code. Highlight any code or text and get structured explanations with diagrams, citations, and quizzes.

## Features

- **Explain Selection** (`Ctrl+Shift+E` / `Cmd+Shift+E`) — Get a structured explanation of highlighted code or text
- **Deep Research** — Research mode with inline citations from web sources
- **Quiz Me** — Generate multiple-choice quiz from selected content
- **Right-click context menu** — All commands available via right-click

## Setup

1. Start the Learning Copilot server:
   ```bash
   cd .. && npm run dev
   ```

2. Install the extension:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   ```

3. Press `F5` in VS Code to launch Extension Development Host

4. Configure API URL in Settings > Learning Copilot (default: `http://localhost:3000`)

## Usage

1. Select code or text in any file
2. Press `Ctrl+Shift+E` (or right-click → "Learning Copilot: Explain Selection")
3. View the explanation in the side panel

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `learningCopilot.apiUrl` | `http://localhost:3000` | API server URL |
| `learningCopilot.level` | `Beginner` | Detail level (Beginner/Intermediate/Advanced) |

## Powered By

- Amazon Bedrock (Nova Pro/Lite)
- Amazon Translate (4 languages)
- Bedrock Knowledge Bases (RAG)
- Bedrock Guardrails (content safety)

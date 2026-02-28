"use client";

import { Sandpack } from "@codesandbox/sandpack-react";

interface CodePlaygroundProps {
  code: string;
  language: string;
  theme: "light" | "dark";
}

const RUNNABLE_LANGUAGES = ["javascript", "typescript", "jsx", "tsx", "react"];

export function CodePlayground({ code, language, theme }: CodePlaygroundProps) {
  const isRunnable = RUNNABLE_LANGUAGES.includes(language.toLowerCase());

  if (!isRunnable) {
    return null;
  }

  const template = language.toLowerCase().includes("react") ? "react" :
                   language.toLowerCase() === "typescript" ? "vanilla-ts" : "vanilla";

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border/50">
      <Sandpack
        template={template as any}
        files={{
          "/index.js": { code, active: true },
        }}
        theme={theme === "dark" ? "dark" : "light"}
        options={{
          showConsole: true,
          showConsoleButton: true,
          editorHeight: 300,
          showTabs: false,
        }}
      />
    </div>
  );
}

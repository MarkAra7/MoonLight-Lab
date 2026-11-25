import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import jsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import cssWorker from "monaco-editor/language/css/css.worker.js?worker";
import htmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import tsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

/**
 * Monaco normally loads its workers from a CDN. Bundling them locally keeps
 * the editor working offline and avoids a third-party runtime dependency.
 */
const environment = self as unknown as {
  MonacoEnvironment: { getWorker: (moduleId: string, label: string) => Worker };
};

environment.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });

export const CODE_LANGUAGES = [
  { value: "js", label: "JavaScript", extension: "js" },
  { value: "ts", label: "TypeScript", extension: "ts" },
  { value: "py", label: "Python", extension: "py" },
  { value: "java", label: "Java", extension: "java" },
  { value: "cpp", label: "C++", extension: "cpp" },
  { value: "c", label: "C", extension: "c" },
  { value: "go", label: "Go", extension: "go" },
  { value: "rs", label: "Rust", extension: "rs" },
  { value: "rb", label: "Ruby", extension: "rb" },
  { value: "php", label: "PHP", extension: "php" },
  { value: "sql", label: "SQL", extension: "sql" },
  { value: "sh", label: "Bash", extension: "sh" },
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]["value"];

export function languageMeta(language: string): { monaco: string; extension: string; label: string } {
  const found = CODE_LANGUAGES.find((item) => item.value === language);

  return {
    monaco: found?.value ?? language,
    extension: found?.extension ?? "txt",
    label: found?.label ?? language.toUpperCase(),
  };
}

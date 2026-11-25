import Editor from "@monaco-editor/react";
import { useState } from "react";
import { getErrorMessage, miscApi } from "@/api";
import type { CodeTest, CodeTestResult } from "@/api/types";
import { CODE_LANGUAGES, languageMeta } from "@/editor/monacoSetup";

export interface CodeWorkspaceProps {
  code: string;
  onChange: (code: string) => void;
  language?: string;
  languageLocked?: boolean;
  onLanguageChange?: (language: string) => void;
  tests?: CodeTest[];
  /** Hide the Run / Run tests buttons (for example while grading is disabled). */
  readOnlyRun?: boolean;
  /** Prevent both editing and execution while an attempt is being submitted. */
  readOnly?: boolean;
}

type PanelTab = "tests" | "output" | "terminal";

const toolbarButton = [
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700",
  "transition-colors hover:border-sky-500 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50",
  "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300",
].join(" ");

/** A small VS Code-like workspace: file tree, Monaco editor, test and output panels. */
export function CodeWorkspace({
  code,
  onChange,
  language = "js",
  languageLocked = false,
  onLanguageChange,
  tests = [],
  readOnlyRun = false,
  readOnly = false,
}: CodeWorkspaceProps) {
  const meta = languageMeta(language);
  const [panel, setPanel] = useState<PanelTab>("tests");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [testResults, setTestResults] = useState<CodeTestResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError("");
    setOutput("");
    setPanel("output");

    try {
      const { data } = await miscApi.runCode({ code, language, input: stdin });
      setOutput(data.output || "");
      setError(data.error || "");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const runTests = async () => {
    setBusy(true);
    setError("");
    setTestResults([]);
    setPanel("tests");

    try {
      const { data } = await miscApi.runCodeTests({ code, language, tests });
      setTestResults(data.results);
      if (data.total === 0) setError("No tests were configured for this task.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-[#0d1117] shadow-sm dark:border-white/10">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#161b22] px-3 py-2">
        <span className="mr-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2">Explorer</span>
        </span>

        {languageLocked ? (
          <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-slate-300">
            {meta.label}
          </span>
        ) : (
          <select
            aria-label="Programming language"
            value={language}
            disabled={readOnly}
            onChange={(event) => onLanguageChange?.(event.target.value)}
            className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-slate-200 outline-none"
          >
            {CODE_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value} className="bg-[#161b22]">
                {item.label}
              </option>
            ))}
          </select>
        )}

        {!readOnlyRun && (
          <>
            <button type="button" className={toolbarButton} onClick={run} disabled={busy || readOnly}>
              ▶ Run
            </button>
            <button
              type="button"
              className={toolbarButton}
              onClick={runTests}
              disabled={busy || readOnly || tests.length === 0}
            >
              ✓ Run tests
            </button>
          </>
        )}
      </header>

      <div className="flex min-h-[320px]">
        <aside className="hidden w-44 flex-shrink-0 border-r border-white/10 bg-[#10151c] py-2 text-[12px] text-slate-400 sm:block">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Explorer
          </p>
          <p className="bg-white/[0.06] px-3 py-1.5 font-semibold text-slate-200">
            ▾ src
          </p>
          <p className="py-1.5 pl-7 text-sky-300">main.{meta.extension}</p>
          {tests.length > 0 && (
            <>
              <p className="px-3 py-1.5 font-semibold text-slate-200">▾ tests</p>
              {tests.map((_, index) => (
                <p key={index} className="truncate py-1 pl-7 text-slate-400">
                  case-{index + 1}.txt
                </p>
              ))}
            </>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <Editor
            height="340px"
            language={meta.monaco}
            theme="vs-dark"
            value={code}
            onChange={(value) => onChange(value ?? "")}
            options={{
              readOnly,
              fontSize: 13,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              padding: { top: 12 },
            }}
            loading={<div className="p-4 text-sm text-slate-400">Loading editor…</div>}
          />
        </div>
      </div>

      <section className="border-t border-white/10 bg-[#10151c]">
        <div className="flex gap-1 border-b border-white/10 px-2">
          {(["tests", "output", "terminal"] as PanelTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPanel(tab)}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                panel === tab
                  ? "border-b-2 border-sky-400 text-sky-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="max-h-56 min-h-24 overflow-auto px-3 py-3 font-mono text-[12px] leading-relaxed text-slate-300">
          {panel === "tests" && (
            <>
              {tests.length === 0 && (
                <p className="text-slate-500">No visible tests for this task.</p>
              )}
              {testResults.length > 0 ? (
                <ul className="space-y-1.5">
                  {testResults.map((result) => (
                    <li
                      key={result.test}
                      className={result.passed ? "text-emerald-300" : "text-rose-300"}
                    >
                      <span className="font-bold">
                        {result.passed ? "PASS" : "FAIL"} case {result.test}
                      </span>
                      {" · expected "}
                      <span className="text-slate-200">
                        {JSON.stringify(result.expected_output)}
                      </span>
                      {" · got "}
                      <span className="text-slate-200">{JSON.stringify(result.actual_output)}</span>
                      {result.error && <span className="block text-amber-300">{result.error}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1.5">
                  {tests.map((test, index) => (
                    <li key={index} className="text-slate-400">
                      <span className="font-bold text-slate-300">case {index + 1}</span>
                      {test.input ? ` · input ${JSON.stringify(test.input)}` : ""}
                      {" · expected "}
                      <span className="text-slate-200">
                        {JSON.stringify(test.expected_output)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {panel === "output" && (
            <>
              <pre className="whitespace-pre-wrap">{output || "(no output)"}</pre>
              {error && <pre className="mt-2 whitespace-pre-wrap text-rose-300">{error}</pre>}
            </>
          )}

          {panel === "terminal" && (
            <div className="space-y-2">
              <p className="text-slate-500">$ stdin for main.{meta.extension}</p>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                disabled={readOnly}
                rows={3}
                placeholder="Type input for a single run…"
                className="w-full rounded-md border border-white/10 bg-black/30 p-2 text-slate-200 outline-none placeholder:text-slate-600"
              />
              {error && <p className="text-rose-300">{error}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

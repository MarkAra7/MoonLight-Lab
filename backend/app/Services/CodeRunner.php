<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Runs untrusted student code through the Piston execution API.
 *
 * Tests are executed as separate runs with the case's input on stdin; the
 * trimmed stdout is compared with the expected output. Every run has a hard
 * timeout so a looping program cannot block the request.
 */
class CodeRunner
{
    private const SUPPORTED_LANGUAGES = [
        'js' => 'javascript',
        'py' => 'python',
        'java' => 'java',
        'cpp' => 'c++',
        'c' => 'c',
        'rb' => 'ruby',
        'go' => 'go',
        'rs' => 'rust',
        'ts' => 'typescript',
        'php' => 'php',
        'sql' => 'sql',
        'sh' => 'bash',
    ];

    private const TIMEOUT_SECONDS = 15;

    public function supportedLanguages(): array
    {
        return array_keys(self::SUPPORTED_LANGUAGES);
    }

    public function isSupported(string $language): bool
    {
        return isset(self::SUPPORTED_LANGUAGES[$language]);
    }

    /** @return array{output: string, error: string, ok: bool} */
    public function run(string $code, string $language, string $input = ''): array
    {
        $result = $this->execute($code, $language, $input);

        return [
            'output' => $result['output'],
            'error' => $result['error'],
            'ok' => $result['ok'],
        ];
    }

    /**
     * @param  array<int, array{input?: string, expected_output?: string, hidden?: bool}>  $tests
     * @return array{passed: int, total: int, results: array<int, array<string, mixed>>}
     */
    public function runTests(string $code, string $language, array $tests): array
    {
        $results = [];
        $passed = 0;

        foreach (array_values($tests) as $index => $test) {
            $input = (string) ($test['input'] ?? '');
            $expected = trim((string) ($test['expected_output'] ?? ''));
            $run = $this->execute($code, $language, $input);
            $actual = trim($run['output']);
            $ok = $run['ok'] && $actual === $expected;

            if ($ok) {
                $passed++;
            }

            $results[] = [
                'test' => $index + 1,
                'input' => $input,
                'expected_output' => $expected,
                'actual_output' => $actual,
                'passed' => $ok,
                'error' => $run['error'],
                'hidden' => (bool) ($test['hidden'] ?? false),
            ];
        }

        return [
            'passed' => $passed,
            'total' => count($results),
            'results' => $results,
        ];
    }

    /** @return array{output: string, error: string, ok: bool} */
    private function execute(string $code, string $language, string $input): array
    {
        if (! $this->isSupported($language)) {
            return ['output' => '', 'error' => 'Unsupported language.', 'ok' => false];
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)->post('https://emkc.org/api/v2/piston/execute', [
                'language' => self::SUPPORTED_LANGUAGES[$language],
                'version' => '*',
                'files' => [['name' => 'main', 'content' => $code]],
                'stdin' => $input,
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return ['output' => '', 'error' => 'Could not reach the execution service.', 'ok' => false];
        }

        if ($response->failed()) {
            return [
                'output' => '',
                'error' => 'Execution service unavailable (status: '.$response->status().').',
                'ok' => false,
            ];
        }

        $result = $response->json();
        $run = $result['run'] ?? [];
        $error = trim((string) ($run['stderr'] ?? '')) ?: (string) ($result['message'] ?? '');
        $exitCode = (int) ($run['code'] ?? -1);

        return [
            'output' => (string) ($run['stdout'] ?? ''),
            'error' => $error,
            'ok' => $exitCode === 0 && $error === '',
        ];
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CodeRunner;
use Illuminate\Http\Request;

class RunCodeController extends Controller
{
    public function __construct(private readonly CodeRunner $runner)
    {
    }

    public function execute(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:10000',
            'language' => 'required|string|in:'.implode(',', $this->runner->supportedLanguages()),
            'input' => 'nullable|string|max:4000',
        ]);

        $result = $this->runner->run(
            $data['code'],
            $data['language'],
            (string) ($data['input'] ?? '')
        );

        if (str_starts_with($result['error'], 'Could not reach')) {
            return response()->json([
                'output' => '',
                'error' => 'Could not reach the execution service. Please try again.',
            ], 502);
        }

        if (str_starts_with($result['error'], 'Execution service unavailable')) {
            return response()->json(['output' => '', 'error' => $result['error']], 502);
        }

        return response()->json([
            'output' => $result['output'],
            'error' => $result['error'],
            'ok' => $result['ok'],
        ]);
    }

    /** Previews every test of a code question without saving an attempt. */
    public function tests(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:10000',
            'language' => 'required|string|in:'.implode(',', $this->runner->supportedLanguages()),
            'tests' => 'required|array|min:1|max:20',
            'tests.*.input' => 'nullable|string|max:4000',
            'tests.*.expected_output' => 'required|string|max:4000',
            'tests.*.hidden' => 'nullable|boolean',
        ]);

        return response()->json($this->runner->runTests($data['code'], $data['language'], $data['tests']));
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class RunCodeController extends Controller
{
    private const SUPPORTED_LANGUAGES = [
        'js' => ['language' => 'javascript', 'version' => '*'],
        'py' => ['language' => 'python', 'version' => '*'],
        'java' => ['language' => 'java', 'version' => '*'],
        'cpp' => ['language' => 'c++', 'version' => '*'],
        'c' => ['language' => 'c', 'version' => '*'],
        'rb' => ['language' => 'ruby', 'version' => '*'],
        'go' => ['language' => 'go', 'version' => '*'],
        'rs' => ['language' => 'rust', 'version' => '*'],
        'ts' => ['language' => 'typescript', 'version' => '*'],
        'php' => ['language' => 'php', 'version' => '*'],
        'sql' => ['language' => 'sql', 'version' => '*'],
        'sh' => ['language' => 'bash', 'version' => '*'],
    ];

    public function execute(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:10000',
            'language' => 'required|string|in:' . implode(',', array_keys(self::SUPPORTED_LANGUAGES)),
        ]);

        $lang = self::SUPPORTED_LANGUAGES[$data['language']];

        try {
            $response = Http::timeout(15)->post('https://emkc.org/api/v2/piston/execute', [
                'language' => $lang['language'],
                'version' => $lang['version'],
                'files' => [
                    ['name' => 'main', 'content' => $data['code']],
                ],
            ]);

            if ($response->failed()) {
                return response()->json([
                    'output' => '',
                    'error' => 'Execution service unavailable (status: ' . $response->status() . ').',
                ], 502);
            }

            $result = $response->json();
            $run = $result['run'] ?? [];

            return response()->json([
                'output' => $run['stdout'] ?? '',
                'error' => $run['stderr'] ?? ($result['message'] ?? ''),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'output' => '',
                'error' => 'Connection error: ' . $e->getMessage(),
            ], 502);
        }
    }

    public static function getSupportedLanguages(): array
    {
        return array_keys(self::SUPPORTED_LANGUAGES);
    }
}

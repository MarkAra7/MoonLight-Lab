<?php

namespace App\Http\Controllers\Api\V1\Media;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{

    public function show(Media $media)
    {
        Gate::authorize('view', $media);

        return response()->json($media);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'file' => 'nullable|file|max:10240',
            'url' => 'nullable|string|max:2048',
            'provider' => 'nullable|string|max:50',
            'thumbnail_url' => 'nullable|string|max:2048',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $mime = $file->getClientMimeType();

            $fileId = 'MEDIA-' . strtoupper(Str::random(5)) . '-' . rand(10000, 99999);

            $folder = match (true) {
                str_starts_with($mime, 'image/gif') => 'gifs',
                str_starts_with($mime, 'image/') => 'images',
                str_starts_with($mime, 'video/') => 'videos',
                str_starts_with($mime, 'audio/') => 'audio',
                default => 'documents',
            };

            $ext = $file->getClientOriginalExtension();
            $path = $file->storeAs("$folder/" . auth()->id(), "$fileId.$ext", 'public');

            $media = Media::create([
                'file_id' => $fileId,
                'user_id' => auth()->id(),
                'type' => 'file',
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
            ]);

            Log::info('Media file uploaded', ['file_id' => $media->file_id, 'user_id' => auth()->id(), 'folder' => $folder, 'file_name' => $media->file_name, 'mime_type' => $media->mime_type, 'file_size' => $media->file_size]);

            return response()->json($media, 201);
        }

        if ($request->filled('url')) {
            $media = Media::create([
                'user_id' => auth()->id(),
                'type' => 'link',
                'url' => $data['url'],
                'provider' => $data['provider'] ?? null,
                'thumbnail_url' => $data['thumbnail_url'] ?? null,
            ]);

            Log::info('Media URL saved', ['file_id' => $media->file_id, 'user_id' => auth()->id(), 'url' => $media->url, 'provider' => $media->provider]);

            return response()->json($media, 201);
        }

        return response()->json(['message' => 'Provide a file or a URL.'], 422);
    }

    public function destroy(Media $media)
    {
        Gate::authorize('delete', $media);

        if ($media->type === 'file' && $media->file_path) {
            Storage::disk('public')->delete($media->file_path);
        }

        $media->delete();

        Log::info('Media deleted', ['file_id' => $media->file_id, 'user_id' => auth()->id(), 'type' => $media->type]);

        return response()->noContent();
    }
}

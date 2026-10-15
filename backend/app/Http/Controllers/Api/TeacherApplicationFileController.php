<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherApplication;
use App\Services\TeacherApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * An application's CV and video live on a private disk. Admins never get a standing URL:
 * the authenticated links() endpoint mints short-lived signed links on demand, and serve()
 * streams the file for a valid signature only. Links (rather than an Authorization header)
 * are what a <video> element or PDF iframe can use, and they let the browser stream and
 * seek (Range requests) instead of loading a 500 MB video into memory.
 */
class TeacherApplicationFileController extends Controller
{
    /** Long enough to watch a ~5 minute video with pauses and seeking; reopening mints new ones. */
    private const LINK_MINUTES = 30;

    public function links(TeacherApplication $teacherApplication, string $file): JsonResponse
    {
        Gate::authorize('view', $teacherApplication);

        abort_unless($this->path($teacherApplication, $file), 404, 'This application has no such file.');

        $expiresAt = now()->addMinutes(self::LINK_MINUTES);
        $link = fn (string $disposition) => URL::temporarySignedRoute('teacher-applications.files.serve', $expiresAt, [
            'teacherApplication' => $teacherApplication->id,
            'file' => $file,
            'disposition' => $disposition,
        ]);

        return response()->json([
            'view_url' => $link(ResponseHeaderBag::DISPOSITION_INLINE),
            'download_url' => $link(ResponseHeaderBag::DISPOSITION_ATTACHMENT),
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Streams the file (signed URL only; see the `signed` route middleware). The disposition
     * is part of the signature, so a view link can't be turned into anything else.
     */
    public function serve(TeacherApplication $teacherApplication, string $file, string $disposition): BinaryFileResponse
    {
        $path = $this->path($teacherApplication, $file);
        $disk = Storage::disk(TeacherApplicationService::DISK);

        abort_unless($path && $disk->exists($path), 404);

        // TODO(S3): redirect to $disk->temporaryUrl() with ResponseContentDisposition instead.
        $response = response()->file($disk->path($path), [
            'Content-Type' => TeacherApplicationService::mimeType($path),
            // Never sniff: a ".pdf" that's really HTML must not render as a page.
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store',
        ]);

        $name = TeacherApplicationService::downloadName($teacherApplication, $file, $path);

        // BinaryFileResponse defaults to "public", which would let shared caches keep a copy.
        return $response->setPrivate()->setContentDisposition($disposition, $name, $name);
    }

    private function path(TeacherApplication $application, string $file): ?string
    {
        return $file === 'cv' ? $application->cv_path : $application->video_path;
    }
}

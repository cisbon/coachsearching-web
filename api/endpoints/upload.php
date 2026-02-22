<?php
/**
 * CoachSearching - File Upload Endpoint
 *
 * Handles authenticated file uploads and stores them in Cloudflare R2.
 * R2 credentials are backend-only and never exposed to the frontend.
 *
 * Endpoint:
 *   POST /upload  (multipart/form-data)
 *
 * Form fields:
 *   file    - The file to upload (required)
 *   bucket  - Target R2 bucket name (required)
 *   key     - Optional custom object key; auto-generated if omitted
 *
 * Returns:
 *   { success: true, data: { url, key, bucket } }
 */

declare(strict_types=1);

use CoachSearching\Api\Auth;
use CoachSearching\Api\Response;
use CoachSearching\Api\R2Storage;

require_once __DIR__ . '/../lib/R2Storage.php';

/**
 * Allowed MIME types and their canonical file extensions.
 */
const UPLOAD_ALLOWED_TYPES = [
    'image/jpeg'      => 'jpg',
    'image/png'       => 'png',
    'image/gif'       => 'gif',
    'image/webp'      => 'webp',
    'application/pdf' => 'pdf',
];

/**
 * Buckets that only accept image files (no PDFs).
 * coach-certifications accepts PDFs as well.
 */
const UPLOAD_IMAGE_ONLY_BUCKETS = [
    'profile-images',
    'profile-banners',
    'feed-media',
    'certifications-badges',
];

/** Maximum upload size: 10 MB */
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Main handler — called from index.php
 */
function handleUpload(string $method): void
{
    if ($method !== 'POST') {
        Response::error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
    }

    // Require a valid Supabase JWT
    $user = Auth::user();
    if (!$user || empty($user['id'])) {
        Response::error('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Validate file presence
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $phpError = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        Response::error('No file uploaded or upload error (PHP code ' . $phpError . ')', 400, 'NO_FILE');
    }

    $file = $_FILES['file'];

    // Validate bucket
    $bucket = trim($_POST['bucket'] ?? '');
    if (!in_array($bucket, R2Storage::ALLOWED_BUCKETS, true)) {
        Response::error('Invalid or disallowed bucket name', 400, 'INVALID_BUCKET');
    }

    // Validate file size
    if ($file['size'] > UPLOAD_MAX_BYTES) {
        Response::error('File exceeds maximum allowed size of 10 MB', 413, 'FILE_TOO_LARGE');
    }

    // Validate MIME type via finfo (more reliable than $_FILES['type'])
    $finfo       = new \finfo(FILEINFO_MIME_TYPE);
    $contentType = $finfo->file($file['tmp_name']);

    if (!array_key_exists($contentType, UPLOAD_ALLOWED_TYPES)) {
        Response::error('File type not permitted: ' . $contentType, 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    // Image-only buckets must not receive PDFs
    if (in_array($bucket, UPLOAD_IMAGE_ONLY_BUCKETS, true) && !str_starts_with($contentType, 'image/')) {
        Response::error('Only image files are allowed for this bucket', 415, 'IMAGES_ONLY');
    }

    // Build object key: {stem}{userId}{timestampMs}.{ext}
    // stem = sanitized original filename without extension (caller-supplied or derived from upload name)
    $userId  = $user['id'];
    $origName = trim($_POST['original_name'] ?? '');
    if ($origName === '') {
        $origName = pathinfo($file['name'], PATHINFO_FILENAME);
    }
    // Keep only alphanumeric, dash, underscore for the stem
    $stem = preg_replace('/[^a-zA-Z0-9\-_]/', '', $origName);
    if ($stem === '') {
        $stem = 'file';
    }
    $ext          = UPLOAD_ALLOWED_TYPES[$contentType];
    $timestampMs  = (int)(microtime(true) * 1000);
    $key          = $stem . $userId . $timestampMs . '.' . $ext;

    // Generate a presigned PUT URL for the browser to upload directly to R2.
    // This avoids server-side TLS issues; the browser handles the R2 connection.
    $r2     = new R2Storage();
    $result = $r2->generatePresignedPutUrl($bucket, $key);

    if (!$result['success']) {
        $r2Error = $result['error'] ?? 'unknown';
        error_log('R2 presign error for user ' . $userId . ': ' . $r2Error);
        Response::error('Upload to storage failed: ' . $r2Error, 500, 'STORAGE_ERROR');
    }

    $publicUrl    = $r2->getPublicUrl($bucket, $key);
    $presignedUrl = $result['url'];

    Response::success([
        'url'          => $publicUrl,
        'presigned_url' => $presignedUrl,
        'key'          => $key,
        'bucket'       => $bucket,
    ], 201);
}

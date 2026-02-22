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
 * Allowed MIME types and their file extensions.
 */
const UPLOAD_ALLOWED_TYPES = [
    'image/jpeg'      => ['jpg', 'jpeg'],
    'image/png'       => ['png'],
    'image/gif'       => ['gif'],
    'image/webp'      => ['webp'],
    'application/pdf' => ['pdf'],
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

    // Build object key
    $userId    = $user['id'];
    $customKey = trim($_POST['key'] ?? '');

    if ($customKey !== '') {
        // Sanitize caller-supplied key: allow alphanumeric, dash, underscore, dot, slash
        $key = preg_replace('/[^a-zA-Z0-9\-_\.\/]/', '_', $customKey);
    } else {
        $ext = UPLOAD_ALLOWED_TYPES[$contentType][0];
        $key = $userId . '/' . uniqid('', true) . '.' . $ext;
    }

    // Read file content from temp location
    $fileContent = file_get_contents($file['tmp_name']);
    if ($fileContent === false) {
        Response::error('Failed to read uploaded file', 500, 'READ_ERROR');
    }

    // Upload to R2
    $r2     = new R2Storage();
    $result = $r2->upload($bucket, $key, $fileContent, $contentType);

    if (!$result['success']) {
        error_log('R2 upload error for user ' . $userId . ': ' . ($result['error'] ?? 'unknown'));
        Response::error('Upload to storage failed', 500, 'STORAGE_ERROR');
    }

    $publicUrl = $r2->getPublicUrl($bucket, $key);

    Response::success([
        'url'    => $publicUrl,
        'key'    => $key,
        'bucket' => $bucket,
    ], 201);
}

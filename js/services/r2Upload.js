/**
 * r2Upload.js — shared helper for browser-direct uploads to Cloudflare R2
 *
 * Flow:
 *  1. POST file + metadata to the PHP /upload endpoint.
 *     The backend validates the file (auth, MIME type, size) and returns a
 *     presigned PUT URL along with the final public URL.  No data is written
 *     to R2 at this stage.
 *  2. Browser PUTs the file directly to R2 using the presigned URL.
 *     This bypasses PHP entirely for the actual data transfer, avoiding any
 *     server-side TLS / SSL issues.
 *
 * R2 CORS requirement:
 *  Each R2 bucket must have a CORS rule that allows PUT from your app origin.
 *  In Cloudflare Dashboard → R2 → <bucket> → Settings → CORS Policy add:
 *  [
 *    {
 *      "AllowedOrigins": ["https://coachsearching.com","https://www.coachsearching.com"],
 *      "AllowedMethods": ["PUT"],
 *      "AllowedHeaders": ["Content-Type"],
 *      "MaxAgeSeconds": 3600
 *    }
 *  ]
 *
 * @param {object}      opts
 * @param {string}      opts.apiBase       Backend API base URL
 * @param {File|Blob}   opts.file          File or Blob to upload
 * @param {string}      opts.bucket        Target R2 bucket name
 * @param {string}      opts.originalName  Original filename stem (no extension)
 * @param {string|null} opts.accessToken   JWT access token (or null for unauthenticated)
 * @returns {Promise<string>}              Resolves with the public URL of the uploaded file
 * @throws {Error}                         Rejects with a user-readable message on failure
 */
export async function uploadToR2({ apiBase, file, bucket, originalName, accessToken }) {
    // ── Step 1: POST to backend for validation + presigned URL ────────────────
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('original_name', originalName || 'file');

    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    const metaRes  = await fetch(`${apiBase}/upload`, { method: 'POST', headers, body: formData });
    const metaJson = await metaRes.json();

    if (!metaRes.ok) {
        throw new Error(
            metaJson.error?.message ||
            metaJson.error ||
            `Upload init failed (HTTP ${metaRes.status})`
        );
    }

    const presignedUrl = metaJson.data?.presigned_url || metaJson.presigned_url;
    const publicUrl    = metaJson.data?.url            || metaJson.url;

    if (!presignedUrl) {
        throw new Error('Backend did not return a presigned URL');
    }

    // ── Step 2: PUT file directly to R2 ──────────────────────────────────────
    // The presigned URL is time-limited and pre-authorised; no auth header needed.
    const putRes = await fetch(presignedUrl, {
        method:  'PUT',
        body:    file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });

    if (!putRes.ok) {
        const errText = await putRes.text().catch(() => '');
        throw new Error(
            `Upload to storage failed (HTTP ${putRes.status})` +
            (errText ? ': ' + errText.slice(0, 200) : '')
        );
    }

    return publicUrl;
}

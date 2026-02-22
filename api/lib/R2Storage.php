<?php
/**
 * R2Storage - Cloudflare R2 Object Storage Client
 *
 * Implements AWS Signature Version 4 for S3-compatible uploads to Cloudflare R2.
 * R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT) are
 * read exclusively from backend config and must never be exposed to the frontend.
 *
 * Supported buckets:
 *   - profile-images       (coach/client profile photos)
 *   - profile-banners      (coach profile cover/banner images)
 *   - coach-certifications (coach certification PDF documents)
 *   - feed-media           (feed post images)
 *   - certifications-badges (certification badge/admin public assets)
 */

namespace CoachSearching\Api;

class R2Storage
{
    private string $accessKeyId;
    private string $secretAccessKey;
    private string $endpoint;
    private string $region = 'auto';
    private string $service = 's3';

    /** Buckets that are valid upload targets */
    public const ALLOWED_BUCKETS = [
        'profile-images',
        'profile-banners',
        'coach-certifications',
        'feed-media',
        'certifications-badges',
    ];

    public function __construct()
    {
        $this->accessKeyId    = defined('R2_ACCESS_KEY_ID')     ? R2_ACCESS_KEY_ID     : (getenv('R2_ACCESS_KEY_ID')     ?: '');
        $this->secretAccessKey = defined('R2_SECRET_ACCESS_KEY') ? R2_SECRET_ACCESS_KEY : (getenv('R2_SECRET_ACCESS_KEY') ?: '');
        $this->endpoint       = rtrim(defined('R2_ENDPOINT') ? R2_ENDPOINT : (getenv('R2_ENDPOINT') ?: ''), '/');
    }

    /**
     * Upload a file to an R2 bucket using AWS S3 Signature Version 4.
     *
     * @param string $bucket      Target R2 bucket name
     * @param string $key         Object key (path within the bucket)
     * @param string $fileContent Raw file bytes
     * @param string $contentType MIME type of the file
     * @return array{success: bool, error?: string}
     */
    public function upload(string $bucket, string $key, string $fileContent, string $contentType = 'application/octet-stream'): array
    {
        if (empty($this->accessKeyId) || empty($this->secretAccessKey) || empty($this->endpoint)) {
            return ['success' => false, 'error' => 'R2 credentials not configured'];
        }

        $amzDate   = gmdate('Ymd\THis\Z');
        $dateStamp = gmdate('Ymd');

        $parsedUrl   = parse_url($this->endpoint);
        $host        = $parsedUrl['host'];
        $key         = ltrim($key, '/');

        // Path-style URL: https://<endpoint>/<bucket>/<key>
        $requestUrl  = $this->endpoint . '/' . $bucket . '/' . $key;
        $canonicalUri = '/' . $bucket . '/' . $key;

        $contentHash = hash('sha256', $fileContent);

        // Canonical headers must be sorted alphabetically by header name
        $canonicalHeaders =
            "content-type:{$contentType}\n" .
            "host:{$host}\n" .
            "x-amz-content-sha256:{$contentHash}\n" .
            "x-amz-date:{$amzDate}\n";

        $signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

        $canonicalRequest =
            "PUT\n" .
            $canonicalUri . "\n" .
            "\n" .  // no query string
            $canonicalHeaders . "\n" .
            $signedHeaders . "\n" .
            $contentHash;

        $credentialScope = "{$dateStamp}/{$this->region}/{$this->service}/aws4_request";

        $stringToSign =
            "AWS4-HMAC-SHA256\n" .
            "{$amzDate}\n" .
            "{$credentialScope}\n" .
            hash('sha256', $canonicalRequest);

        $signingKey = $this->deriveSigningKey($dateStamp);
        $signature  = hash_hmac('sha256', $stringToSign, $signingKey);

        $authHeader =
            "AWS4-HMAC-SHA256 " .
            "Credential={$this->accessKeyId}/{$credentialScope}, " .
            "SignedHeaders={$signedHeaders}, " .
            "Signature={$signature}";

        $ch = curl_init($requestUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => $fileContent,
            CURLOPT_HTTPHEADER     => [
                "Authorization: {$authHeader}",
                "Content-Type: {$contentType}",
                "Content-Length: " . strlen($fileContent),
                "x-amz-content-sha256: {$contentHash}",
                "x-amz-date: {$amzDate}",
            ],
            // Force TLS 1.2 — Cloudflare R2 requires it and some OpenSSL 3.x
            // system configs negotiate in a way that triggers handshake failures.
            CURLOPT_SSLVERSION     => CURL_SSLVERSION_TLSv1_2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            // Stick to HTTP/1.1; HTTP/2 multiplexing can cause issues with large
            // binary PUT bodies on some curl builds.
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
            CURLOPT_TIMEOUT        => 60,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $curlErrNo = curl_errno($ch);
        curl_close($ch);

        if ($curlError) {
            error_log("R2Storage cURL error #{$curlErrNo}: {$curlError} | URL: {$requestUrl}");
            return ['success' => false, 'error' => "Connection error: {$curlError}"];
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            error_log("R2Storage upload failed HTTP {$httpCode}: {$response}");
            return ['success' => false, 'error' => "Upload failed with HTTP {$httpCode}"];
        }

        return ['success' => true];
    }

    /**
     * Generate a presigned PUT URL for direct browser-to-R2 upload.
     *
     * No network call to R2 is made — this is a pure cryptographic operation.
     * The returned URL can be used by a browser to PUT a file directly to R2,
     * bypassing the PHP server entirely for the data transfer.
     *
     * IMPORTANT: The R2 bucket must have CORS configured to allow PUT from your
     * app's origin, otherwise browsers will block the preflight OPTIONS request.
     *
     * @param string $bucket    Target R2 bucket name
     * @param string $key       Object key (filename, no leading slash)
     * @param int    $expiresIn Seconds until URL expires (default 15 min)
     * @return array{success: bool, url?: string, error?: string}
     */
    public function generatePresignedPutUrl(string $bucket, string $key, int $expiresIn = 900): array
    {
        if (empty($this->accessKeyId) || empty($this->secretAccessKey) || empty($this->endpoint)) {
            return ['success' => false, 'error' => 'R2 credentials not configured'];
        }

        $amzDate   = gmdate('Ymd\THis\Z');
        $dateStamp = gmdate('Ymd');

        $parsedUrl = parse_url($this->endpoint);
        $host      = $parsedUrl['host'] ?? '';
        $key       = ltrim($key, '/');

        $credentialScope = "{$dateStamp}/{$this->region}/{$this->service}/aws4_request";

        // Query parameters for query-string authentication (must be sorted lexicographically)
        $queryParams = [
            'X-Amz-Algorithm'     => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential'    => $this->accessKeyId . '/' . $credentialScope,
            'X-Amz-Date'          => $amzDate,
            'X-Amz-Expires'       => (string)$expiresIn,
            'X-Amz-SignedHeaders' => 'host',
        ];
        ksort($queryParams);
        $canonicalQueryString = http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);

        // URL-encode the key for both canonical URI and the presigned URL itself
        $encodedKey  = implode('/', array_map('rawurlencode', explode('/', $key)));
        $canonicalUri = '/' . $bucket . '/' . $encodedKey;

        // For presigned URLs, payload hash is the literal string UNSIGNED-PAYLOAD
        $canonicalRequest =
            "PUT\n" .
            $canonicalUri . "\n" .
            $canonicalQueryString . "\n" .
            "host:{$host}\n" .
            "\n" .
            "host\n" .
            'UNSIGNED-PAYLOAD';

        $stringToSign =
            "AWS4-HMAC-SHA256\n" .
            "{$amzDate}\n" .
            "{$credentialScope}\n" .
            hash('sha256', $canonicalRequest);

        $signature = hash_hmac('sha256', $stringToSign, $this->deriveSigningKey($dateStamp));

        $presignedUrl = $this->endpoint
            . '/' . $bucket
            . '/' . $encodedKey
            . '?' . $canonicalQueryString
            . '&X-Amz-Signature=' . $signature;

        return ['success' => true, 'url' => $presignedUrl];
    }

    /**
     * Custom domain map: bucket → public base URL.
     *
     * Each bucket's public access must be enabled in the Cloudflare dashboard
     * and the custom domain configured there.
     */
    private const DOMAIN_MAP = [
        'profile-images'        => 'https://profile-images.coachsearching.com',
        'profile-banners'       => 'https://profile-banners.coachsearching.com',
        'coach-certifications'  => 'https://coach-certifications.coachsearching.com',
        'feed-media'            => 'https://feed-media.coachsearching.com',
        'certifications-badges' => 'https://certification-badges.coachsearching.com',
    ];

    /**
     * Build the public URL for a stored object using the bucket's custom domain.
     *
     * @param string $bucket Bucket name
     * @param string $key    Object key (filename)
     * @return string Public URL  e.g. https://profile-banners.coachsearching.com/myphoto<userId><ts>.jpg
     */
    public function getPublicUrl(string $bucket, string $key): string
    {
        $base = self::DOMAIN_MAP[$bucket] ?? 'https://' . $bucket . '.coachsearching.com';
        return $base . '/' . ltrim($key, '/');
    }

    /**
     * Derive the AWS v4 signing key.
     */
    private function deriveSigningKey(string $dateStamp): string
    {
        $kDate    = hash_hmac('sha256', $dateStamp,      'AWS4' . $this->secretAccessKey, true);
        $kRegion  = hash_hmac('sha256', $this->region,   $kDate,    true);
        $kService = hash_hmac('sha256', $this->service,  $kRegion,  true);
        $kSigning = hash_hmac('sha256', 'aws4_request',  $kService, true);
        return $kSigning;
    }
}

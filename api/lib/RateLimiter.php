<?php
/**
 * Rate Limiter
 * @fileoverview Simple file-based rate limiting for API protection
 */

namespace CoachSearching\Api;

class RateLimiter
{
    /** @var string Cache directory */
    private string $cacheDir;

    /** @var int Maximum requests per window */
    private int $maxRequests;

    /** @var int Time window in seconds */
    private int $windowSeconds;

    /**
     * Create rate limiter instance
     *
     * @param int $maxRequests Maximum requests per window
     * @param int $windowSeconds Time window in seconds
     * @param string|null $cacheDir Cache directory path
     */
    public function __construct(
        int $maxRequests = 60,
        int $windowSeconds = 60,
        ?string $cacheDir = null
    ) {
        $this->maxRequests = $maxRequests;
        $this->windowSeconds = $windowSeconds;
        $this->cacheDir = $cacheDir ?? sys_get_temp_dir() . '/rate_limits';

        // Ensure cache directory exists
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }

    /**
     * Check if request is allowed
     *
     * @param string $identifier Unique identifier (IP, user ID, etc.)
     * @return bool True if request is allowed
     */
    public function isAllowed(string $identifier): bool
    {
        $file = $this->getFilePath($identifier);
        $data = $this->loadData($file);

        $now = time();

        // Remove expired entries
        $data['requests'] = array_filter(
            $data['requests'] ?? [],
            fn($timestamp) => $timestamp > ($now - $this->windowSeconds)
        );

        // Check if limit exceeded
        if (count($data['requests']) >= $this->maxRequests) {
            return false;
        }

        // Record this request
        $data['requests'][] = $now;
        $this->saveData($file, $data);

        return true;
    }

    /**
     * Get remaining requests for identifier
     *
     * @param string $identifier Unique identifier
     * @return int Remaining requests
     */
    public function remaining(string $identifier): int
    {
        $file = $this->getFilePath($identifier);
        $data = $this->loadData($file);

        $now = time();
        $recentRequests = array_filter(
            $data['requests'] ?? [],
            fn($timestamp) => $timestamp > ($now - $this->windowSeconds)
        );

        return max(0, $this->maxRequests - count($recentRequests));
    }

    /**
     * Get seconds until rate limit resets
     *
     * @param string $identifier Unique identifier
     * @return int Seconds until reset
     */
    public function resetIn(string $identifier): int
    {
        $file = $this->getFilePath($identifier);
        $data = $this->loadData($file);

        if (empty($data['requests'])) {
            return 0;
        }

        $oldestRequest = min($data['requests']);
        $resetTime = $oldestRequest + $this->windowSeconds;

        return max(0, $resetTime - time());
    }

    /**
     * Record a hit without checking limit
     *
     * @param string $identifier Unique identifier
     */
    public function hit(string $identifier): void
    {
        $file = $this->getFilePath($identifier);
        $data = $this->loadData($file);

        $data['requests'][] = time();
        $this->saveData($file, $data);
    }

    /**
     * Clear rate limit data for identifier
     *
     * @param string $identifier Unique identifier
     */
    public function clear(string $identifier): void
    {
        $file = $this->getFilePath($identifier);
        if (file_exists($file)) {
            unlink($file);
        }
    }

    /**
     * Add rate limit headers to response
     *
     * @param string $identifier Unique identifier
     */
    public function addHeaders(string $identifier): void
    {
        header("X-RateLimit-Limit: {$this->maxRequests}");
        header("X-RateLimit-Remaining: {$this->remaining($identifier)}");
        header("X-RateLimit-Reset: " . (time() + $this->resetIn($identifier)));
    }

    /**
     * Check request and send 429 if limited
     *
     * @param string|null $identifier Identifier (defaults to IP)
     */
    public function check(?string $identifier = null): void
    {
        $identifier = $identifier ?? $this->getClientIdentifier();

        if (!$this->isAllowed($identifier)) {
            $this->addHeaders($identifier);
            Response::rateLimited($this->resetIn($identifier));
        }

        $this->addHeaders($identifier);
    }

    /**
     * Get client identifier (IP address)
     *
     * @return string
     */
    private function getClientIdentifier(): string
    {
        // Check for forwarded IP (when behind proxy/load balancer)
        $headers = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                // X-Forwarded-For may contain multiple IPs
                $ips = explode(',', $_SERVER[$header]);
                return trim($ips[0]);
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Get file path for identifier
     */
    private function getFilePath(string $identifier): string
    {
        // Hash the identifier to prevent directory traversal
        $hash = md5($identifier);
        return $this->cacheDir . '/' . $hash . '.json';
    }

    /**
     * Load data from file
     */
    private function loadData(string $file): array
    {
        if (!file_exists($file)) {
            return ['requests' => []];
        }

        $content = file_get_contents($file);
        return json_decode($content, true) ?? ['requests' => []];
    }

    /**
     * Save data to file
     */
    private function saveData(string $file, array $data): void
    {
        file_put_contents($file, json_encode($data), LOCK_EX);
    }

    /**
     * Clean up old rate limit files
     *
     * @param int $maxAge Maximum file age in seconds
     */
    public function cleanup(int $maxAge = 3600): void
    {
        $files = glob($this->cacheDir . '/*.json');

        foreach ($files as $file) {
            if (filemtime($file) < (time() - $maxAge)) {
                unlink($file);
            }
        }
    }
}

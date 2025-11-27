<?php
/**
 * Response Helper
 * @fileoverview Standardized API response formatting
 */

namespace CoachSearching\Api;

class Response
{
    /**
     * Send a success response
     *
     * @param mixed $data Response data
     * @param int $statusCode HTTP status code
     * @param array $meta Additional metadata
     */
    public static function success($data = null, int $statusCode = 200, array $meta = []): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success' => true,
            'data' => $data,
            'timestamp' => gmdate('c'),
        ];

        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Send an error response
     *
     * @param string $message Error message
     * @param int $statusCode HTTP status code
     * @param string|null $code Error code
     * @param array|null $details Additional error details
     */
    public static function error(
        string $message,
        int $statusCode = 400,
        ?string $code = null,
        ?array $details = null
    ): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code ?? self::getErrorCode($statusCode),
                'status' => $statusCode,
            ],
            'timestamp' => gmdate('c'),
        ];

        if ($details !== null) {
            $response['error']['details'] = $details;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Send a paginated response
     *
     * @param array $items Items for current page
     * @param int $total Total number of items
     * @param int $page Current page number
     * @param int $pageSize Items per page
     */
    public static function paginated(array $items, int $total, int $page = 1, int $pageSize = 20): void
    {
        self::success($items, 200, [
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize,
                'total_pages' => (int)ceil($total / $pageSize),
                'has_next' => ($page * $pageSize) < $total,
                'has_previous' => $page > 1,
            ],
        ]);
    }

    /**
     * Send a created response (201)
     *
     * @param mixed $data Created resource
     * @param string|null $location Location header URL
     */
    public static function created($data, ?string $location = null): void
    {
        if ($location) {
            header("Location: $location");
        }
        self::success($data, 201);
    }

    /**
     * Send a no content response (204)
     */
    public static function noContent(): void
    {
        http_response_code(204);
        exit;
    }

    /**
     * Send unauthorized response
     *
     * @param string $message Error message
     */
    public static function unauthorized(string $message = 'Authentication required'): void
    {
        self::error($message, 401, 'UNAUTHORIZED');
    }

    /**
     * Send forbidden response
     *
     * @param string $message Error message
     */
    public static function forbidden(string $message = 'Access denied'): void
    {
        self::error($message, 403, 'FORBIDDEN');
    }

    /**
     * Send not found response
     *
     * @param string $resource Resource name
     */
    public static function notFound(string $resource = 'Resource'): void
    {
        self::error("$resource not found", 404, 'NOT_FOUND');
    }

    /**
     * Send validation error response
     *
     * @param array $errors Field errors
     */
    public static function validationError(array $errors): void
    {
        self::error('Validation failed', 422, 'VALIDATION_ERROR', ['fields' => $errors]);
    }

    /**
     * Send rate limit exceeded response
     *
     * @param int $retryAfter Seconds until retry allowed
     */
    public static function rateLimited(int $retryAfter = 60): void
    {
        header("Retry-After: $retryAfter");
        self::error('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    /**
     * Send server error response
     *
     * @param string $message Error message (generic for production)
     * @param \Exception|null $exception Exception for logging
     */
    public static function serverError(string $message = 'Internal server error', ?\Exception $exception = null): void
    {
        if ($exception) {
            error_log("Server Error: " . $exception->getMessage() . "\n" . $exception->getTraceAsString());
        }

        // Don't expose internal errors in production
        $displayMessage = self::isProduction() ? 'Internal server error' : $message;
        self::error($displayMessage, 500, 'SERVER_ERROR');
    }

    /**
     * Get standard error code for status
     */
    private static function getErrorCode(int $status): string
    {
        $codes = [
            400 => 'BAD_REQUEST',
            401 => 'UNAUTHORIZED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            405 => 'METHOD_NOT_ALLOWED',
            409 => 'CONFLICT',
            422 => 'VALIDATION_ERROR',
            429 => 'RATE_LIMITED',
            500 => 'SERVER_ERROR',
            502 => 'BAD_GATEWAY',
            503 => 'SERVICE_UNAVAILABLE',
        ];

        return $codes[$status] ?? 'ERROR';
    }

    /**
     * Check if running in production
     */
    private static function isProduction(): bool
    {
        $env = getenv('APP_ENV') ?: 'production';
        return $env === 'production';
    }
}

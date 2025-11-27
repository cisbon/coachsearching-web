<?php
/**
 * Authentication Helper
 * @fileoverview JWT validation and user authentication for API
 */

namespace CoachSearching\Api;

class Auth
{
    /** @var array|null Cached user data */
    private static ?array $user = null;

    /** @var string|null Cached token */
    private static ?string $token = null;

    /**
     * Get the current authenticated user
     *
     * @return array|null User data or null if not authenticated
     */
    public static function user(): ?array
    {
        if (self::$user !== null) {
            return self::$user;
        }

        $token = self::getToken();
        if (!$token) {
            return null;
        }

        // Decode JWT to get user info
        $payload = self::decodeJwt($token);
        if (!$payload) {
            return null;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        self::$user = [
            'id' => $payload['sub'] ?? null,
            'email' => $payload['email'] ?? null,
            'role' => $payload['role'] ?? 'authenticated',
            'user_metadata' => $payload['user_metadata'] ?? [],
        ];

        return self::$user;
    }

    /**
     * Get user ID
     *
     * @return string|null
     */
    public static function id(): ?string
    {
        $user = self::user();
        return $user['id'] ?? null;
    }

    /**
     * Get user email
     *
     * @return string|null
     */
    public static function email(): ?string
    {
        $user = self::user();
        return $user['email'] ?? null;
    }

    /**
     * Check if user is authenticated
     *
     * @return bool
     */
    public static function check(): bool
    {
        return self::user() !== null;
    }

    /**
     * Check if user is a guest (not authenticated)
     *
     * @return bool
     */
    public static function guest(): bool
    {
        return !self::check();
    }

    /**
     * Require authentication - send 401 if not authenticated
     */
    public static function required(): void
    {
        if (!self::check()) {
            Response::unauthorized('Authentication required');
        }
    }

    /**
     * Check if user has a specific role
     *
     * @param string|array $roles Required role(s)
     * @return bool
     */
    public static function hasRole($roles): bool
    {
        $user = self::user();
        if (!$user) {
            return false;
        }

        $userRole = $user['role'] ?? '';
        $roles = (array)$roles;

        return in_array($userRole, $roles, true);
    }

    /**
     * Require a specific role - send 403 if not authorized
     *
     * @param string|array $roles Required role(s)
     */
    public static function requireRole($roles): void
    {
        self::required();

        if (!self::hasRole($roles)) {
            Response::forbidden('Insufficient permissions');
        }
    }

    /**
     * Get the bearer token from request
     *
     * @return string|null
     */
    public static function getToken(): ?string
    {
        if (self::$token !== null) {
            return self::$token;
        }

        // Try Authorization header
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            self::$token = $matches[1];
            return self::$token;
        }

        // Try query parameter (for SSE/WebSocket connections)
        if (!empty($_GET['access_token'])) {
            self::$token = $_GET['access_token'];
            return self::$token;
        }

        return null;
    }

    /**
     * Decode JWT token (without signature verification - Supabase handles this)
     *
     * @param string $token JWT token
     * @return array|null Payload or null if invalid
     */
    private static function decodeJwt(string $token): ?array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        try {
            $payload = base64_decode(strtr($parts[1], '-_', '+/'));
            return json_decode($payload, true);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get user metadata value
     *
     * @param string $key Metadata key
     * @param mixed $default Default value
     * @return mixed
     */
    public static function metadata(string $key, $default = null)
    {
        $user = self::user();
        return $user['user_metadata'][$key] ?? $default;
    }

    /**
     * Check if user is the owner of a resource
     *
     * @param string $userId User ID to check against
     * @return bool
     */
    public static function owns(string $userId): bool
    {
        return self::id() === $userId;
    }

    /**
     * Require ownership of a resource
     *
     * @param string $userId User ID to check against
     * @param string $message Error message
     */
    public static function requireOwnership(string $userId, string $message = 'Access denied'): void
    {
        self::required();

        if (!self::owns($userId)) {
            Response::forbidden($message);
        }
    }

    /**
     * Check if user is admin
     *
     * @return bool
     */
    public static function isAdmin(): bool
    {
        return self::hasRole(['admin', 'service_role']);
    }

    /**
     * Check if user is a coach
     *
     * @return bool
     */
    public static function isCoach(): bool
    {
        $userType = self::metadata('user_type');
        return $userType === 'coach' || self::hasRole('coach');
    }

    /**
     * Clear cached auth data
     */
    public static function clear(): void
    {
        self::$user = null;
        self::$token = null;
    }
}

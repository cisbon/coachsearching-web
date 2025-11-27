<?php
/**
 * Input Sanitizer
 * @fileoverview Input sanitization and XSS prevention utilities
 */

namespace CoachSearching\Api;

class Sanitizer
{
    /**
     * Sanitize a string for safe output
     *
     * @param mixed $value Value to sanitize
     * @param array $options Sanitization options
     * @return string
     */
    public static function string($value, array $options = []): string
    {
        if (!is_string($value)) {
            $value = (string)($value ?? '');
        }

        $defaults = [
            'trim' => true,
            'stripTags' => true,
            'maxLength' => null,
            'allowedTags' => '',
        ];

        $options = array_merge($defaults, $options);

        // Trim whitespace
        if ($options['trim']) {
            $value = trim($value);
        }

        // Strip HTML tags
        if ($options['stripTags']) {
            $value = strip_tags($value, $options['allowedTags']);
        }

        // Encode special characters
        $value = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Limit length
        if ($options['maxLength'] !== null) {
            $value = mb_substr($value, 0, $options['maxLength']);
        }

        return $value;
    }

    /**
     * Sanitize email address
     *
     * @param mixed $email Email to sanitize
     * @return string
     */
    public static function email($email): string
    {
        if (!is_string($email)) {
            return '';
        }

        $email = trim(strtolower($email));
        return filter_var($email, FILTER_SANITIZE_EMAIL) ?: '';
    }

    /**
     * Sanitize URL
     *
     * @param mixed $url URL to sanitize
     * @return string
     */
    public static function url($url): string
    {
        if (!is_string($url)) {
            return '';
        }

        $url = trim($url);
        $sanitized = filter_var($url, FILTER_SANITIZE_URL);

        // Validate it's a proper URL
        if ($sanitized && filter_var($sanitized, FILTER_VALIDATE_URL)) {
            // Only allow http and https
            $scheme = parse_url($sanitized, PHP_URL_SCHEME);
            if (in_array($scheme, ['http', 'https'], true)) {
                return $sanitized;
            }
        }

        return '';
    }

    /**
     * Sanitize integer
     *
     * @param mixed $value Value to sanitize
     * @param int|null $min Minimum value
     * @param int|null $max Maximum value
     * @return int
     */
    public static function int($value, ?int $min = null, ?int $max = null): int
    {
        $int = (int)filter_var($value, FILTER_SANITIZE_NUMBER_INT);

        if ($min !== null && $int < $min) {
            $int = $min;
        }

        if ($max !== null && $int > $max) {
            $int = $max;
        }

        return $int;
    }

    /**
     * Sanitize float
     *
     * @param mixed $value Value to sanitize
     * @param float|null $min Minimum value
     * @param float|null $max Maximum value
     * @param int $decimals Number of decimal places
     * @return float
     */
    public static function float($value, ?float $min = null, ?float $max = null, int $decimals = 2): float
    {
        $float = (float)filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);

        if ($min !== null && $float < $min) {
            $float = $min;
        }

        if ($max !== null && $float > $max) {
            $float = $max;
        }

        return round($float, $decimals);
    }

    /**
     * Sanitize boolean
     *
     * @param mixed $value Value to sanitize
     * @return bool
     */
    public static function bool($value): bool
    {
        if (is_string($value)) {
            $value = strtolower($value);
            return in_array($value, ['true', '1', 'yes', 'on'], true);
        }

        return (bool)$value;
    }

    /**
     * Sanitize array
     *
     * @param mixed $value Value to sanitize
     * @param callable|null $itemSanitizer Function to sanitize each item
     * @return array
     */
    public static function array($value, ?callable $itemSanitizer = null): array
    {
        if (!is_array($value)) {
            return [];
        }

        if ($itemSanitizer === null) {
            $itemSanitizer = [self::class, 'string'];
        }

        return array_map($itemSanitizer, $value);
    }

    /**
     * Sanitize JSON string
     *
     * @param mixed $json JSON string to sanitize
     * @return array
     */
    public static function json($json): array
    {
        if (is_array($json)) {
            return $json;
        }

        if (!is_string($json)) {
            return [];
        }

        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Sanitize UUID
     *
     * @param mixed $uuid UUID to sanitize
     * @return string|null
     */
    public static function uuid($uuid): ?string
    {
        if (!is_string($uuid)) {
            return null;
        }

        $uuid = trim(strtolower($uuid));
        $pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/';

        return preg_match($pattern, $uuid) ? $uuid : null;
    }

    /**
     * Sanitize date string
     *
     * @param mixed $date Date string to sanitize
     * @param string $format Output format
     * @return string|null
     */
    public static function date($date, string $format = 'Y-m-d\TH:i:s\Z'): ?string
    {
        if (!is_string($date)) {
            return null;
        }

        try {
            $dateTime = new \DateTime($date);
            return $dateTime->format($format);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Sanitize filename
     *
     * @param mixed $filename Filename to sanitize
     * @return string
     */
    public static function filename($filename): string
    {
        if (!is_string($filename)) {
            return '';
        }

        // Remove directory traversal attempts
        $filename = basename($filename);

        // Remove special characters
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);

        // Limit length
        if (strlen($filename) > 255) {
            $ext = pathinfo($filename, PATHINFO_EXTENSION);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $name = substr($name, 0, 250 - strlen($ext));
            $filename = $name . '.' . $ext;
        }

        return $filename;
    }

    /**
     * Sanitize rich text (allow some HTML)
     *
     * @param mixed $html HTML to sanitize
     * @param array $allowedTags Allowed HTML tags
     * @return string
     */
    public static function richText($html, array $allowedTags = []): string
    {
        if (!is_string($html)) {
            return '';
        }

        $defaultTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'];
        $tags = !empty($allowedTags) ? $allowedTags : $defaultTags;

        $tagString = '<' . implode('><', $tags) . '>';

        $html = strip_tags($html, $tagString);

        // Remove javascript: and data: URLs
        $html = preg_replace('/\s*(on\w+|javascript:|data:)[^>]*/i', '', $html);

        return $html;
    }

    /**
     * Batch sanitize input data
     *
     * @param array $data Input data
     * @param array $rules Sanitization rules (field => type or [type, options])
     * @return array Sanitized data
     */
    public static function sanitize(array $data, array $rules): array
    {
        $result = [];

        foreach ($rules as $field => $rule) {
            if (!isset($data[$field])) {
                continue;
            }

            $type = is_array($rule) ? $rule[0] : $rule;
            $options = is_array($rule) ? ($rule[1] ?? []) : [];

            switch ($type) {
                case 'string':
                    $result[$field] = self::string($data[$field], $options);
                    break;
                case 'email':
                    $result[$field] = self::email($data[$field]);
                    break;
                case 'url':
                    $result[$field] = self::url($data[$field]);
                    break;
                case 'int':
                    $result[$field] = self::int(
                        $data[$field],
                        $options['min'] ?? null,
                        $options['max'] ?? null
                    );
                    break;
                case 'float':
                    $result[$field] = self::float(
                        $data[$field],
                        $options['min'] ?? null,
                        $options['max'] ?? null,
                        $options['decimals'] ?? 2
                    );
                    break;
                case 'bool':
                    $result[$field] = self::bool($data[$field]);
                    break;
                case 'array':
                    $result[$field] = self::array($data[$field], $options['sanitizer'] ?? null);
                    break;
                case 'uuid':
                    $result[$field] = self::uuid($data[$field]);
                    break;
                case 'date':
                    $result[$field] = self::date($data[$field], $options['format'] ?? 'Y-m-d\TH:i:s\Z');
                    break;
                case 'richText':
                    $result[$field] = self::richText($data[$field], $options['allowedTags'] ?? []);
                    break;
                default:
                    $result[$field] = self::string($data[$field]);
            }
        }

        return $result;
    }
}

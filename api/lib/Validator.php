<?php
/**
 * Input Validator
 * @fileoverview Comprehensive input validation for API requests
 */

namespace CoachSearching\Api;

class Validator
{
    /** @var array<string, string> Validation errors */
    private array $errors = [];

    /** @var array<string, mixed> Data to validate */
    private array $data = [];

    /**
     * Create a new validator instance
     *
     * @param array $data Data to validate
     */
    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Static factory method
     *
     * @param array $data Data to validate
     * @return self
     */
    public static function make(array $data): self
    {
        return new self($data);
    }

    /**
     * Validate that a field is required
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function required(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            $this->errors[$field] = $message ?? "$field is required";
        }

        return $this;
    }

    /**
     * Validate email format
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function email(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = $message ?? "Invalid email address";
        }

        return $this;
    }

    /**
     * Validate URL format
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function url(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_URL)) {
            $this->errors[$field] = $message ?? "Invalid URL";
        }

        return $this;
    }

    /**
     * Validate minimum string length
     *
     * @param string $field Field name
     * @param int $min Minimum length
     * @param string|null $message Custom error message
     * @return self
     */
    public function minLength(string $field, int $min, ?string $message = null): self
    {
        $value = $this->data[$field] ?? '';

        if (is_string($value) && mb_strlen($value) < $min) {
            $this->errors[$field] = $message ?? "$field must be at least $min characters";
        }

        return $this;
    }

    /**
     * Validate maximum string length
     *
     * @param string $field Field name
     * @param int $max Maximum length
     * @param string|null $message Custom error message
     * @return self
     */
    public function maxLength(string $field, int $max, ?string $message = null): self
    {
        $value = $this->data[$field] ?? '';

        if (is_string($value) && mb_strlen($value) > $max) {
            $this->errors[$field] = $message ?? "$field cannot exceed $max characters";
        }

        return $this;
    }

    /**
     * Validate numeric value
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function numeric(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !is_numeric($value)) {
            $this->errors[$field] = $message ?? "$field must be a number";
        }

        return $this;
    }

    /**
     * Validate minimum value
     *
     * @param string $field Field name
     * @param float $min Minimum value
     * @param string|null $message Custom error message
     * @return self
     */
    public function min(string $field, float $min, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && is_numeric($value) && (float)$value < $min) {
            $this->errors[$field] = $message ?? "$field must be at least $min";
        }

        return $this;
    }

    /**
     * Validate maximum value
     *
     * @param string $field Field name
     * @param float $max Maximum value
     * @param string|null $message Custom error message
     * @return self
     */
    public function max(string $field, float $max, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && is_numeric($value) && (float)$value > $max) {
            $this->errors[$field] = $message ?? "$field cannot exceed $max";
        }

        return $this;
    }

    /**
     * Validate value is in a list
     *
     * @param string $field Field name
     * @param array $allowed Allowed values
     * @param string|null $message Custom error message
     * @return self
     */
    public function in(string $field, array $allowed, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && !in_array($value, $allowed, true)) {
            $allowedStr = implode(', ', $allowed);
            $this->errors[$field] = $message ?? "$field must be one of: $allowedStr";
        }

        return $this;
    }

    /**
     * Validate date format
     *
     * @param string $field Field name
     * @param string $format Date format (default: ISO 8601)
     * @param string|null $message Custom error message
     * @return self
     */
    public function date(string $field, string $format = 'Y-m-d\TH:i:s', ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '') {
            $date = \DateTime::createFromFormat($format, $value);
            // Also try ISO 8601 with timezone
            if (!$date) {
                try {
                    new \DateTime($value);
                } catch (\Exception $e) {
                    $this->errors[$field] = $message ?? "Invalid date format";
                }
            }
        }

        return $this;
    }

    /**
     * Validate date is in the future
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function future(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '') {
            try {
                $date = new \DateTime($value);
                $now = new \DateTime();

                if ($date <= $now) {
                    $this->errors[$field] = $message ?? "$field must be in the future";
                }
            } catch (\Exception $e) {
                // Date parsing will be caught by date() validator
            }
        }

        return $this;
    }

    /**
     * Validate with a custom callback
     *
     * @param string $field Field name
     * @param callable $callback Callback that returns bool
     * @param string $message Error message if validation fails
     * @return self
     */
    public function custom(string $field, callable $callback, string $message): self
    {
        $value = $this->data[$field] ?? null;

        if (!$callback($value, $this->data)) {
            $this->errors[$field] = $message;
        }

        return $this;
    }

    /**
     * Validate array field
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function array(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && !is_array($value)) {
            $this->errors[$field] = $message ?? "$field must be an array";
        }

        return $this;
    }

    /**
     * Validate UUID format
     *
     * @param string $field Field name
     * @param string|null $message Custom error message
     * @return self
     */
    public function uuid(string $field, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;
        $pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

        if ($value !== null && $value !== '' && !preg_match($pattern, $value)) {
            $this->errors[$field] = $message ?? "Invalid UUID format";
        }

        return $this;
    }

    /**
     * Validate with regex pattern
     *
     * @param string $field Field name
     * @param string $pattern Regex pattern
     * @param string|null $message Custom error message
     * @return self
     */
    public function pattern(string $field, string $pattern, ?string $message = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !preg_match($pattern, $value)) {
            $this->errors[$field] = $message ?? "Invalid format";
        }

        return $this;
    }

    /**
     * Check if validation passed
     *
     * @return bool
     */
    public function passes(): bool
    {
        return empty($this->errors);
    }

    /**
     * Check if validation failed
     *
     * @return bool
     */
    public function fails(): bool
    {
        return !empty($this->errors);
    }

    /**
     * Get validation errors
     *
     * @return array<string, string>
     */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * Get validated data (only fields that were validated)
     *
     * @return array
     */
    public function validated(): array
    {
        return $this->data;
    }

    /**
     * Get a specific validated value
     *
     * @param string $field Field name
     * @param mixed $default Default value if not set
     * @return mixed
     */
    public function get(string $field, $default = null)
    {
        return $this->data[$field] ?? $default;
    }

    /**
     * Throw validation error response if validation fails
     */
    public function validate(): void
    {
        if ($this->fails()) {
            Response::validationError($this->errors());
        }
    }
}

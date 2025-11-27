/**
 * useForm Hook
 * @fileoverview Form state management with validation
 */

const React = window.React;
const { useState, useCallback, useMemo, useRef } = React;

import { validateSchema, validateField } from '../utils/validation.js';

/**
 * @typedef {Object} FormState
 * @property {Record<string, *>} values - Form values
 * @property {Record<string, string>} errors - Field errors
 * @property {Record<string, boolean>} touched - Touched fields
 * @property {boolean} isValid - Form is valid
 * @property {boolean} isSubmitting - Form is submitting
 * @property {boolean} isDirty - Form has been modified
 */

/**
 * Hook for form state management
 * @template T
 * @param {Object} options - Form options
 * @param {T} options.initialValues - Initial form values
 * @param {Object} [options.validationSchema] - Validation schema
 * @param {boolean} [options.validateOnChange=true] - Validate on change
 * @param {boolean} [options.validateOnBlur=true] - Validate on blur
 * @param {(values: T) => Promise<void>} [options.onSubmit] - Submit handler
 * @returns {Object} Form helpers
 */
export function useForm(options) {
  const {
    initialValues,
    validationSchema,
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
  } = options;

  const initialValuesRef = useRef(initialValues);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Check if form has been modified
   */
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    if (!validationSchema) return true;
    const result = validateSchema(values, validationSchema);
    return result.valid;
  }, [values, validationSchema]);

  /**
   * Validate a single field
   * @param {string} name - Field name
   * @param {*} value - Field value
   * @returns {string|null} Error message or null
   */
  const validateFieldValue = useCallback(
    (name, value) => {
      if (!validationSchema || !validationSchema[name]) return null;

      const result = validateField(value, validationSchema[name]);
      return result.error;
    },
    [validationSchema]
  );

  /**
   * Validate all fields
   * @returns {Record<string, string>} Errors
   */
  const validateAll = useCallback(() => {
    if (!validationSchema) return {};

    const result = validateSchema(values, validationSchema);
    setErrors(result.errors);
    return result.errors;
  }, [values, validationSchema]);

  /**
   * Set field value
   * @param {string} name - Field name
   * @param {*} value - Field value
   */
  const setFieldValue = useCallback(
    (name, value) => {
      setValues(prev => ({ ...prev, [name]: value }));

      if (validateOnChange && validationSchema) {
        const error = validateFieldValue(name, value);
        setErrors(prev => {
          if (error) {
            return { ...prev, [name]: error };
          }
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validateOnChange, validationSchema, validateFieldValue]
  );

  /**
   * Set multiple field values
   * @param {Partial<T>} newValues - New values
   */
  const setFieldValues = useCallback(newValues => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  /**
   * Set field touched
   * @param {string} name - Field name
   * @param {boolean} [isTouched=true] - Touched state
   */
  const setFieldTouched = useCallback(
    (name, isTouched = true) => {
      setTouched(prev => ({ ...prev, [name]: isTouched }));

      if (validateOnBlur && validationSchema && isTouched) {
        const error = validateFieldValue(name, values[name]);
        setErrors(prev => {
          if (error) {
            return { ...prev, [name]: error };
          }
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validateOnBlur, validationSchema, validateFieldValue, values]
  );

  /**
   * Set field error manually
   * @param {string} name - Field name
   * @param {string|null} error - Error message
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => {
      if (error) {
        return { ...prev, [name]: error };
      }
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Handle input change event
   * @param {Event} e - Input event
   */
  const handleChange = useCallback(
    e => {
      const { name, value, type, checked } = e.target;
      const newValue = type === 'checkbox' ? checked : value;
      setFieldValue(name, newValue);
    },
    [setFieldValue]
  );

  /**
   * Handle input blur event
   * @param {Event} e - Blur event
   */
  const handleBlur = useCallback(
    e => {
      const { name } = e.target;
      setFieldTouched(name, true);
    },
    [setFieldTouched]
  );

  /**
   * Handle form submission
   * @param {Event} [e] - Form event
   */
  const handleSubmit = useCallback(
    async e => {
      if (e) {
        e.preventDefault();
      }

      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched(allTouched);

      // Validate all fields
      const validationErrors = validateAll();

      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validateAll, onSubmit]
  );

  /**
   * Reset form to initial values
   * @param {T} [newValues] - New initial values
   */
  const reset = useCallback(
    newValues => {
      const resetValues = newValues || initialValuesRef.current;
      setValues(resetValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);

      if (newValues) {
        initialValuesRef.current = newValues;
      }
    },
    []
  );

  /**
   * Get props for an input field
   * @param {string} name - Field name
   * @returns {Object} Input props
   */
  const getFieldProps = useCallback(
    name => ({
      name,
      value: values[name] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [values, handleChange, handleBlur]
  );

  /**
   * Get meta info for a field
   * @param {string} name - Field name
   * @returns {Object} Field meta
   */
  const getFieldMeta = useCallback(
    name => ({
      value: values[name],
      error: errors[name],
      touched: touched[name] || false,
      hasError: Boolean(errors[name] && touched[name]),
    }),
    [values, errors, touched]
  );

  return {
    // State
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,

    // Setters
    setFieldValue,
    setFieldValues,
    setFieldTouched,
    setFieldError,
    setValues,
    setErrors,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,

    // Utilities
    reset,
    validateAll,
    validateFieldValue,
    getFieldProps,
    getFieldMeta,
  };
}

export default useForm;

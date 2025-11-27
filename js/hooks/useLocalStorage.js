/**
 * useLocalStorage Hook
 * Persist state to localStorage
 */

const React = window.React;
const { useState, useEffect, useCallback } = React;

/**
 * Hook to sync state with localStorage
 * @param {string} key - localStorage key
 * @param {*} initialValue - Initial value if not in storage
 * @returns {[*, function, function]} - [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
    // Get initial value from localStorage or use default
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage when state changes
    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Remove from localStorage
    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
}

export default useLocalStorage;

/**
 * Error Boundary Component
 * @fileoverview Catch and handle React component errors gracefully
 */

import htm from '../vendor/htm.js';

const React = window.React;
const { Component } = React;
const html = htm.bind(React.createElement);

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - Whether an error occurred
 * @property {Error|null} error - The error object
 * @property {string|null} errorInfo - Component stack trace
 */

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    /** @type {ErrorBoundaryState} */
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error occurs
   * @param {Error} error
   * @returns {ErrorBoundaryState}
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Log error information
   * @param {Error} error
   * @param {{ componentStack: string }} errorInfo
   */
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo: errorInfo.componentStack });

    // Log to console in development
    if (window.DEBUG_MODE || window.location.hostname === 'localhost') {
      console.error('Error Boundary caught an error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }

    // Log to error tracking service if available
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state
   */
  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  /**
   * Reload the page
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, FallbackComponent, showDetails = false } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback component if provided
    if (FallbackComponent) {
      return html`<${FallbackComponent}
        error=${error}
        errorInfo=${errorInfo}
        onRetry=${this.handleRetry}
        onReload=${this.handleReload}
      />`;
    }

    // Use custom fallback element if provided
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return html`
      <div class="error-boundary" style=${styles.container}>
        <div style=${styles.card}>
          <div style=${styles.icon}>⚠️</div>
          <h2 style=${styles.title}>Something went wrong</h2>
          <p style=${styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </p>

          ${showDetails &&
          error &&
          html`
            <details style=${styles.details}>
              <summary style=${styles.summary}>Error Details</summary>
              <pre style=${styles.code}>${error.message}</pre>
              ${errorInfo && html` <pre style=${styles.stack}>${errorInfo}</pre> `}
            </details>
          `}

          <div style=${styles.actions}>
            <button style=${styles.buttonPrimary} onClick=${this.handleRetry}>Try Again</button>
            <button style=${styles.buttonSecondary} onClick=${this.handleReload}>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Styles for the error boundary
 */
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '20px',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    padding: '40px',
    textAlign: 'center',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 12px',
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 24px',
    lineHeight: '1.5',
  },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px',
  },
  code: {
    fontSize: '13px',
    padding: '12px',
    background: '#1f2937',
    color: '#ef4444',
    borderRadius: '6px',
    overflow: 'auto',
    margin: '8px 0',
  },
  stack: {
    fontSize: '11px',
    padding: '12px',
    background: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '6px',
    overflow: 'auto',
    maxHeight: '200px',
    margin: '8px 0 0',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  buttonPrimary: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    background: '#006266',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  buttonSecondary: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    background: '#e5e7eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

/**
 * Higher-order component to wrap a component with an error boundary
 * @param {React.ComponentType} WrappedComponent - Component to wrap
 * @param {Object} [errorBoundaryProps] - Props for the error boundary
 * @returns {React.ComponentType}
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary = props => {
    return html`
      <${ErrorBoundary} ...${errorBoundaryProps}>
        <${WrappedComponent} ...${props} />
      </${ErrorBoundary}>
    `;
  };

  WithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

/**
 * Simple error fallback for less critical sections
 * @param {{ message?: string }} props
 */
export function ErrorFallback({ message = 'Something went wrong' }) {
  return html`
    <div style=${{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      <span style=${{ fontSize: '24px' }}>⚠️</span>
      <p style=${{ marginTop: '8px' }}>${message}</p>
    </div>
  `;
}

/**
 * Inline error display for form fields
 * @param {{ error: string }} props
 */
export function FieldError({ error }) {
  if (!error) return null;

  return html`
    <span
      style=${{
        display: 'block',
        fontSize: '13px',
        color: '#ef4444',
        marginTop: '4px',
      }}
    >
      ${error}
    </span>
  `;
}

export default ErrorBoundary;

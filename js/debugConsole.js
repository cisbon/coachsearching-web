// js/debugConsole.js - iPad-friendly debug console

export class DebugConsole {
    constructor() {
        this.logs = [];
        this.isVisible = localStorage.getItem('debugConsoleVisible') === 'true';
        this.uiEnabled = false; // UI hidden by default until user is logged in
        this.maxLogs = 100;
        this.errorCount = 0;
        this.warnCount = 0;
        this.init();
        this.interceptConsole();
    }

    init() {
        // Create console container
        const container = document.createElement('div');
        container.id = 'debug-console';
        container.className = `debug-console ${this.isVisible ? 'visible' : 'hidden'}`;
        container.style.display = 'none'; // Hidden until logged in
        container.innerHTML = `
            <div class="debug-console-header">
                <span class="debug-console-title">Debug Console</span>
                <div class="debug-console-actions">
                    <span class="debug-console-badge error-badge" id="debug-error-count" title="Errors">
                        ❌ <span class="badge-count">0</span>
                    </span>
                    <span class="debug-console-badge warn-badge" id="debug-warn-count" title="Warnings">
                        ⚠️ <span class="badge-count">0</span>
                    </span>
                    <button class="debug-console-btn" id="debug-clear" title="Clear logs">🗑️</button>
                    <button class="debug-console-btn" id="debug-copy" title="Copy to clipboard">📋</button>
                    <button class="debug-console-btn" id="debug-toggle" title="Hide console">▼</button>
                </div>
            </div>
            <div class="debug-console-body" id="debug-console-body"></div>
        `;
        document.body.appendChild(container);

        // Create toggle button (hidden until logged in)
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'debug-console-fab';
        toggleBtn.className = 'debug-console-fab';
        toggleBtn.style.display = 'none'; // Hidden until logged in
        toggleBtn.innerHTML = '🐛';
        toggleBtn.title = 'Toggle Debug Console';
        document.body.appendChild(toggleBtn);

        this.container = container;
        this.fab = toggleBtn;
        this.body = document.getElementById('debug-console-body');
        this.attachEvents();
    }

    // Enable/disable UI visibility based on login state
    setUIEnabled(enabled) {
        this.uiEnabled = enabled;
        if (enabled) {
            this.fab.style.display = '';
            if (this.isVisible) {
                this.container.style.display = '';
            }
        } else {
            this.fab.style.display = 'none';
            this.container.style.display = 'none';
        }
    }

    attachEvents() {
        // Toggle console
        document.getElementById('debug-toggle').addEventListener('click', () => {
            this.toggle();
        });

        document.getElementById('debug-console-fab').addEventListener('click', () => {
            this.show();
        });

        // Clear logs
        document.getElementById('debug-clear').addEventListener('click', () => {
            this.clear();
        });

        // Copy to clipboard
        document.getElementById('debug-copy').addEventListener('click', () => {
            this.copyToClipboard();
        });
    }

    interceptConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        console.log = (...args) => {
            this.addLog('log', args);
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('error', args);
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args);
            originalWarn.apply(console, args);
        };

        console.info = (...args) => {
            this.addLog('info', args);
            originalInfo.apply(console, args);
        };

        // Catch global errors
        window.addEventListener('error', (event) => {
            this.addLog('error', [`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
        });
    }

    addLog(type, args) {
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        const log = { timestamp, type, message };
        this.logs.push(log);

        // Update counts
        if (type === 'error') {
            this.errorCount++;
            this.updateCountBadge('error', this.errorCount);
        } else if (type === 'warn') {
            this.warnCount++;
            this.updateCountBadge('warn', this.warnCount);
        }

        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.renderLog(log);
    }

    updateCountBadge(type, count) {
        const badgeId = type === 'error' ? 'debug-error-count' : 'debug-warn-count';
        const badge = document.getElementById(badgeId);
        if (badge) {
            const countSpan = badge.querySelector('.badge-count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        }
    }

    renderLog(log) {
        const logElement = document.createElement('div');
        logElement.className = `debug-log debug-log-${log.type}`;
        logElement.innerHTML = `
            <span class="debug-log-time">${log.timestamp}</span>
            <span class="debug-log-type">[${log.type.toUpperCase()}]</span>
            <span class="debug-log-message">${this.escapeHtml(log.message)}</span>
        `;
        this.body.appendChild(logElement);

        // Auto-scroll to bottom
        this.body.scrollTop = this.body.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clear() {
        this.logs = [];
        this.body.innerHTML = '';
        this.errorCount = 0;
        this.warnCount = 0;
        this.updateCountBadge('error', 0);
        this.updateCountBadge('warn', 0);
        this.addLog('info', ['Console cleared']);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.className = `debug-console ${this.isVisible ? 'visible' : 'hidden'}`;
        if (this.uiEnabled) {
            this.container.style.display = this.isVisible ? '' : 'none';
        }
        localStorage.setItem('debugConsoleVisible', this.isVisible);

        const toggleBtn = document.getElementById('debug-toggle');
        toggleBtn.innerHTML = this.isVisible ? '▼' : '▲';
        toggleBtn.title = this.isVisible ? 'Hide console' : 'Show console';
    }

    show() {
        if (!this.uiEnabled) return;
        this.isVisible = true;
        this.container.style.display = '';
        this.container.className = 'debug-console visible';
        localStorage.setItem('debugConsoleVisible', 'true');
        document.getElementById('debug-toggle').innerHTML = '▼';
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.container.className = 'debug-console hidden';
        localStorage.setItem('debugConsoleVisible', 'false');
        document.getElementById('debug-toggle').innerHTML = '▲';
    }

    async copyToClipboard() {
        const text = this.logs.map(log =>
            `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n');

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                this.addLog('info', ['Logs copied to clipboard!']);
            } else {
                // Fallback for older browsers/iPad
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.addLog('info', ['Logs copied to clipboard (fallback method)!']);
            }
        } catch (err) {
            this.addLog('error', ['Failed to copy logs: ' + err.message]);
        }
    }

    getLogsAsText() {
        return this.logs.map(log =>
            `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n');
    }
}

// Initialize debug console
export function initDebugConsole() {
    if (!window.debugConsole) {
        window.debugConsole = new DebugConsole();
    }
    return window.debugConsole;
}

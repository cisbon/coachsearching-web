import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect } from 'react';

export const PWAInstaller = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('[PWA] SW registered', reg))
                .catch(err => console.error('[PWA] SW registration failed', err));
        }
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShowInstallPrompt(true), 30000);
        });
    }, []);

    return html`<div class="pwa-installer"></div>`;
};

export default PWAInstaller;

// js/app.js
console.log('App.js: Loading...');
// UMD Globals
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;

console.log('App.js: React global', React);
console.log('App.js: ReactDOM global', ReactDOM);

import htm from './vendor/htm.js';
console.log('App.js: htm imported');
import { initLanguage, t, setLanguage } from './i18n.js';
import { useStore, actions } from './store.js';

console.log('App.js: Imports complete');

const html = htm.bind(React.createElement);

// Initialize
initLanguage();

// Components (Inline for simplicity in this file, usually split out)
const Navbar = () => {
    return html`
        <header>
            <div class="container nav-flex">
                <a href="#" class="logo">CoachSearching</a>
                <nav class="nav-links">
                    <a href="#home">${t('nav.home')}</a>
                    <a href="#coaches">${t('nav.coaches')}</a>
                    <a href="#dashboard">${t('nav.dashboard')}</a>
                    <select onChange=${(e) => setLanguage(e.target.value)}>
                        <option value="en">EN</option>
                        <option value="de">DE</option>
                        <option value="es">ES</option>
                        <option value="fr">FR</option>
                        <option value="it">IT</option>
                    </select>
                </nav>
            </div>
        </header>
    `;
};

const Hero = () => {
    return html`
        <section class="hero">
            <div class="container">
                <h1>${t('hero.title')}</h1>
                <p>${t('hero.subtitle')}</p>
                <div class="search-box">
                    <input type="text" placeholder="${t('search.placeholder')}" class="form-control" style="max-width: 400px; display: inline-block; margin-right: 10px;" />
                    <button class="btn btn-secondary">${t('search.btn')}</button>
                </div>
            </div>
        </section>
    `;
};

const CoachCard = ({ coach }) => {
    return html`
        <div class="card">
            <div class="card-body">
                <h3 class="card-title">${coach.full_name}</h3>
                <p class="card-text">${coach.title}</p>
                <p><strong>${t('coach.hourly_rate')}:</strong> $${coach.hourly_rate}</p>
                <button class="btn btn-primary mt-4">${t('coach.book')}</button>
            </div>
        </div>
    `;
};

const CoachList = () => {
    const { coaches, loading } = useStore();

    useEffect(() => {
        actions.fetchCoaches();
    }, []);

    if (loading) return html`<div class="container text-center mt-4">Loading...</div>`;

    return html`
        <div class="container">
            <div class="grid">
                ${coaches.map(coach => html`<${CoachCard} key=${coach.id} coach=${coach} />`)}
            </div>
        </div>
    `;
};

const Home = () => {
    return html`
        <div>
            <${Hero} />
            <${CoachList} />
        </div>
    `;
};

const App = () => {
    // Simple Hash Router
    const [route, setRoute] = useState(window.location.hash || '#home');

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash || '#home');
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('langChange', () => setRoute(r => r)); // Force re-render on lang change
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('langChange', () => { });
        };
    }, []);

    let Component;
    switch (route) {
        case '#home': Component = Home; break;
        case '#coaches': Component = CoachList; break;
        // Add more routes
        default: Component = Home;
    }

    return html`
        <div>
            <${Navbar} />
            <${Component} />
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);

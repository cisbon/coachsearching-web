// js/i18n.js

const translations = {
    en: {
        "nav.home": "Home",
        "nav.coaches": "Find a Coach",
        "nav.dashboard": "Dashboard",
        "nav.login": "Login",
        "hero.title": "Find Your Perfect Coach",
        "hero.subtitle": "Professional coaching for business, life, and personal growth.",
        "search.placeholder": "Search by name, title, or bio...",
        "search.btn": "Search",
        "coach.hourly_rate": "Hourly Rate",
        "coach.book": "Book Now",
        "footer.copyright": "© 2025 CoachSearching. All rights reserved."
    },
    de: {
        "nav.home": "Startseite",
        "nav.coaches": "Coach finden",
        "nav.dashboard": "Dashboard",
        "nav.login": "Anmelden",
        "hero.title": "Finde deinen perfekten Coach",
        "hero.subtitle": "Professionelles Coaching für Business, Leben und persönliches Wachstum.",
        "search.placeholder": "Suche nach Name, Titel oder Bio...",
        "search.btn": "Suchen",
        "coach.hourly_rate": "Stundensatz",
        "coach.book": "Jetzt buchen",
        "footer.copyright": "© 2025 CoachSearching. Alle Rechte vorbehalten."
    },
    es: {
        "nav.home": "Inicio",
        "nav.coaches": "Buscar Coach",
        "nav.dashboard": "Panel",
        "nav.login": "Entrar",
        "hero.title": "Encuentra tu Coach Perfecto",
        "hero.subtitle": "Coaching profesional para negocios, vida y crecimiento personal.",
        "search.placeholder": "Buscar por nombre, título o biografía...",
        "search.btn": "Buscar",
        "coach.hourly_rate": "Tarifa por hora",
        "coach.book": "Reservar ahora",
        "footer.copyright": "© 2025 CoachSearching. Todos los derechos reservados."
    },
    fr: {
        "nav.home": "Accueil",
        "nav.coaches": "Trouver un Coach",
        "nav.dashboard": "Tableau de bord",
        "nav.login": "Connexion",
        "hero.title": "Trouvez votre Coach Idéal",
        "hero.subtitle": "Coaching professionnel pour les affaires, la vie et la croissance personnelle.",
        "search.placeholder": "Rechercher par nom, titre ou bio...",
        "search.btn": "Rechercher",
        "coach.hourly_rate": "Taux horaire",
        "coach.book": "Réserver maintenant",
        "footer.copyright": "© 2025 CoachSearching. Tous droits réservés."
    },
    it: {
        "nav.home": "Home",
        "nav.coaches": "Trova un Coach",
        "nav.dashboard": "Dashboard",
        "nav.login": "Accedi",
        "hero.title": "Trova il tuo Coach Perfetto",
        "hero.subtitle": "Coaching professionale per affari, vita e crescita personale.",
        "search.placeholder": "Cerca per nome, titolo o bio...",
        "search.btn": "Cerca",
        "coach.hourly_rate": "Tariffa oraria",
        "coach.book": "Prenota ora",
        "footer.copyright": "© 2025 CoachSearching. Tutti i diritti riservati."
    }
};

let currentLang = 'en';

export function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        // Dispatch event to re-render
        window.dispatchEvent(new Event('langChange'));
    }
}

export function t(key) {
    return translations[currentLang][key] || key;
}

export function initLanguage() {
    const saved = localStorage.getItem('lang');
    if (saved && translations[saved]) {
        currentLang = saved;
    } else {
        // Simple IP-based mock or browser language detection
        const browserLang = navigator.language.split('-')[0];
        if (translations[browserLang]) {
            currentLang = browserLang;
        }
    }
}

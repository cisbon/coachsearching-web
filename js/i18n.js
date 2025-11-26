// js/i18n.js - Complete translations including onboarding

const translations = {
    en: {
        // Navigation
        "nav.home": "Home",
        "nav.coaches": "Find a Coach",
        "nav.dashboard": "Dashboard",
        "nav.login": "Login",

        // Hero
        "hero.title": "Find Your Perfect Coach",
        "hero.subtitle": "Professional coaching for business, life, and personal growth.",

        // Search
        "search.placeholder": "Search by name, title, or bio...",
        "search.btn": "Search",
        "search.online": "Online",
        "search.onsite": "On-Site",
        "search.locationPlaceholder": "Location (e.g., New York, NY)",
        "search.within": "Within",

        // Coach
        "coach.hourly_rate": "Hourly Rate",
        "coach.book": "Book Now",
        "coach.view_profile": "View Profile",
        "coach.reviews": "reviews",

        // Footer
        "footer.copyright": "© 2025 CoachSearching. All rights reserved.",

        // Dashboard
        "dashboard.welcome": "Welcome",
        "dashboard.overview": "Overview",
        "dashboard.bookings": "My Bookings",
        "dashboard.articles": "Articles",
        "dashboard.probono": "Pro-bono Sessions",
        "dashboard.earnings": "Earnings",
        "dashboard.profile": "Profile",
        "dashboard.packages": "Session Packages",

        // Booking
        "booking.title": "Book a Session",
        "booking.select_package": "Select a Package",
        "booking.confirm": "Confirm Booking",
        "booking.cancel": "Cancel",

        // Article
        "article.new": "New Article",
        "article.title": "Title",
        "article.content": "Content",
        "article.preview": "Preview",
        "article.save_draft": "Save Draft",
        "article.publish": "Publish",
        "article.share_linkedin": "Share on LinkedIn",
        "article.share_twitter": "Share on Twitter",

        // Pro-bono
        "probono.add_slot": "Add Free Slot",
        "probono.hours_tracked": "Pro-bono Hours",

        // Review
        "review.write": "Write a Review",
        "review.rating": "Rating",
        "review.comment": "Your Comment",
        "review.submit": "Submit Review",

        // Admin
        "admin.feature_flags": "Feature Flags",
        "admin.users": "Users",
        "admin.stats": "Statistics",

        // Profile
        "profile.onboarding": "Complete Your Profile",
        "profile.update": "Update Profile",

        // Auth
        "auth.signin": "Sign In",
        "auth.signup": "Create Account",
        "auth.email": "Email Address",
        "auth.password": "Password",
        "auth.selectType": "I want to register as:",
        "auth.client": "Client",
        "auth.clientDesc": "Find and book coaching sessions",
        "auth.coach": "Coach",
        "auth.coachDesc": "Offer coaching services",
        "auth.business": "Business",
        "auth.businessDesc": "Manage team coaching needs",

        // Languages
        "lang.english": "English",
        "lang.german": "German",
        "lang.french": "French",
        "lang.spanish": "Spanish",
        "lang.italian": "Italian",
        "lang.dutch": "Dutch",
        "lang.portuguese": "Portuguese",
        "lang.polish": "Polish",
        "lang.russian": "Russian",

        // Goals
        "goal.career": "Career Development",
        "goal.leadership": "Leadership Skills",
        "goal.life": "Life Balance",
        "goal.health": "Health & Wellness",
        "goal.relationships": "Relationships",
        "goal.business": "Business Growth",
        "goal.mindset": "Mindset & Confidence",
        "goal.financial": "Financial Goals",

        // Onboarding - General
        "onboard.title": "Complete Your Coach Profile",
        "onboard.previous": "Previous",
        "onboard.next": "Next →",
        "onboard.complete": "Complete",
        "onboard.skipForNow": "Skip for now",
        "onboard.skipConfirm": "Are you sure you want to skip onboarding? You can always complete it later from your settings.",
        "onboard.welcomeComplete": "Welcome aboard! Your profile is all set up.",
        "onboard.saveFailed": "Failed to save your profile. Please try again.",

        // Onboarding - Welcome
        "onboard.welcomeTitle": "Welcome to CoachSearching!",
        "onboard.welcomeDescCoach": "Let's set up your coaching profile and start connecting with clients.",
        "onboard.welcomeDescClient": "Let's personalize your experience and help you find the perfect coach.",
        "onboard.quickSetup": "Quick Setup",
        "onboard.quickSetupDesc": "Just 4 simple steps",
        "onboard.autoSave": "Auto-Save",
        "onboard.autoSaveDesc": "Your progress is saved automatically",
        "onboard.skipAnytime": "Skip Anytime",
        "onboard.skipAnytimeDesc": "Complete it later if you need",
        "onboard.letsStart": "Let's Get Started",

        // Onboarding - Steps
        "onboard.step.welcome": "Welcome",
        "onboard.step.goals": "Goals",
        "onboard.step.preferences": "Preferences",
        "onboard.step.complete": "Complete",
        "onboard.step.profile": "Profile",
        "onboard.step.specialties": "Specialties",
        "onboard.step.pricing": "Pricing",

        // Onboarding - Client
        "onboard.client.step1Title": "Tell us about yourself",
        "onboard.client.step1Desc": "This helps us personalize your coaching experience.",
        "onboard.client.step2Title": "What are your goals?",
        "onboard.client.step2Desc": "Select all that apply. This helps us match you with the right coaches.",
        "onboard.client.step3Title": "Your Preferences",
        "onboard.client.step3Desc": "Help us find coaches that match your needs.",
        "onboard.client.completeTitle": "You're All Set!",
        "onboard.client.completeDesc": "Your profile is ready. Let's find you the perfect coach!",

        // Onboarding - Coach
        "onboard.coach.step1Title": "Create Your Coach Profile",
        "onboard.coach.step1Desc": "This is how clients will discover you.",
        "onboard.coach.step2Title": "Your Specialties",
        "onboard.coach.step2Desc": "Add your coaching specialties and languages.",
        "onboard.coach.step3Title": "Set Your Rates",
        "onboard.coach.step3Desc": "You can always adjust these later.",
        "onboard.coach.completeTitle": "Welcome to CoachSearching!",
        "onboard.coach.completeDesc": "Your coach profile is ready. Let's get you verified and start connecting with clients!",

        // Onboarding - Form Fields
        "onboard.displayName": "What should we call you?",
        "onboard.displayNamePlaceholder": "Your preferred name",
        "onboard.location": "Location",
        "onboard.locationPlaceholder": "City, Country",
        "onboard.aboutYou": "Tell us a bit about yourself (optional)",
        "onboard.aboutYouPlaceholder": "What brings you to CoachSearching? What are you looking to achieve?",
        "onboard.specificGoals": "Anything specific you'd like to work on? (optional)",
        "onboard.specificGoalsPlaceholder": "e.g., I want to transition to a new career, improve my leadership skills...",
        "onboard.sessionFormat": "Preferred Session Format",
        "onboard.videoCall": "Video Call",
        "onboard.inPerson": "In-Person",
        "onboard.phoneCall": "Phone Call",
        "onboard.either": "Either",
        "onboard.budget": "Budget Range (per hour)",
        "onboard.minPrice": "Min €",
        "onboard.maxPrice": "Max €",
        "onboard.to": "to",
        "onboard.preferredLanguages": "Preferred Languages",

        // Onboarding - Coach Profile
        "onboard.profilePicture": "Profile Picture",
        "onboard.uploadPhoto": "Click or drag to upload",
        "onboard.uploadHint": "JPG, PNG up to 5MB",
        "onboard.changePhoto": "Change photo",
        "onboard.invalidImageType": "Please select an image file",
        "onboard.imageTooLarge": "Image must be less than 5MB",
        "onboard.fullName": "Full Name",
        "onboard.jobTitle": "Professional Title",
        "onboard.jobTitlePlaceholder": "e.g., Certified Life Coach, Business Strategist",
        "onboard.yearsExperience": "Years of Experience",
        "onboard.bio": "Professional Bio",
        "onboard.bioHelp": "Tell clients about your background, approach, and what makes you unique.",
        "onboard.bioPlaceholder": "I'm a certified life coach with 5 years of experience helping professionals transition careers and find fulfillment...",
        "onboard.characters": "characters",

        // Onboarding - Specialties
        "onboard.specialties": "Your Specialties",
        "onboard.specialtiesHelp": "Type a specialty and press comma or Enter to add it",
        "onboard.specialtiesPlaceholder": "e.g., Life Coaching, Career Development, Executive Coaching...",
        "onboard.popularSpecialties": "Popular specialties",
        "onboard.pillHint": "Press comma or Enter to add",
        "onboard.sessionLanguages": "Languages You Offer Sessions In",

        // Onboarding - Pricing
        "onboard.hourlyRate": "Hourly Rate",
        "onboard.hourlyRatePlaceholder": "e.g., 75",
        "onboard.platformFee": "Platform fee",
        "onboard.youReceive": "You'll receive",
        "onboard.hour": "hour",
        "onboard.sessionDurations": "Session Duration Options",
        "onboard.sessionFormats": "Session Formats You Offer",
        "onboard.videoCallDesc": "Online sessions via video",
        "onboard.inPersonDesc": "Face-to-face sessions",
        "onboard.phoneCallDesc": "Audio-only sessions",
        "onboard.pricingPreview": "Pricing Preview",
        "onboard.sessionPrice": "1-hour session price",

        // Onboarding - On-site Address
        "onboard.onsiteAddress": "On-Site Session Address",
        "onboard.onsiteAddressHelp": "Where will you meet clients for in-person sessions?",
        "onboard.streetAddress": "Street address",
        "onboard.city": "City",
        "onboard.postalCode": "Postal code",
        "onboard.country": "Country",

        // Onboarding - Completion
        "onboard.profileSummary": "Your Profile Summary",
        "onboard.coachProfile": "Your Coach Profile",
        "onboard.name": "Name",
        "onboard.title": "Title",
        "onboard.experience": "Experience",
        "onboard.years": "years",
        "onboard.languages": "Languages",
        "onboard.goals": "Goals",
        "onboard.selected": "selected",
        "onboard.whatNext": "What's Next?",
        "onboard.nextSteps": "Next Steps",
        "onboard.browseCoaches": "Browse Coaches",
        "onboard.browseCoachesDesc": "Find coaches that match your goals",
        "onboard.bookSession": "Book a Session",
        "onboard.bookSessionDesc": "Schedule your first coaching session",
        "onboard.getSupport": "Get Support",
        "onboard.getSupportDesc": "We're here to help anytime",
        "onboard.getVerified": "Get Verified",
        "onboard.getVerifiedDesc": "Submit your credentials for verification",
        "onboard.setAvailability": "Set Availability",
        "onboard.setAvailabilityDesc": "Add your available time slots",
        "onboard.completeProfile": "Complete Profile",
        "onboard.completeProfileDesc": "Add portfolio items and certifications",
        "onboard.verifiedBadge": "Get Verified to Stand Out!",
        "onboard.verifiedBadgeDesc": "Verified coaches get 3x more bookings. Upload your credentials to get your verified badge.",
        "onboard.avatar": "Profile Picture URL",
        "onboard.submit": "Complete Profile",
        "onboard.uploading": "Saving..."
    },
    de: {
        // Navigation
        "nav.home": "Startseite",
        "nav.coaches": "Coach finden",
        "nav.dashboard": "Dashboard",
        "nav.login": "Anmelden",

        // Hero
        "hero.title": "Finde deinen perfekten Coach",
        "hero.subtitle": "Professionelles Coaching für Business, Leben und persönliches Wachstum.",

        // Search
        "search.placeholder": "Suche nach Name, Titel oder Bio...",
        "search.btn": "Suchen",
        "search.online": "Online",
        "search.onsite": "Vor Ort",
        "search.locationPlaceholder": "Standort (z.B. Berlin, Deutschland)",
        "search.within": "Innerhalb",

        // Coach
        "coach.hourly_rate": "Stundensatz",
        "coach.book": "Jetzt buchen",
        "coach.view_profile": "Profil ansehen",
        "coach.reviews": "Bewertungen",

        // Footer
        "footer.copyright": "© 2025 CoachSearching. Alle Rechte vorbehalten.",

        // Dashboard
        "dashboard.welcome": "Willkommen",
        "dashboard.overview": "Übersicht",
        "dashboard.bookings": "Meine Buchungen",
        "dashboard.articles": "Artikel",
        "dashboard.probono": "Pro-bono Sitzungen",
        "dashboard.earnings": "Einnahmen",
        "dashboard.profile": "Profil",
        "dashboard.packages": "Sitzungspakete",

        // Booking
        "booking.title": "Sitzung buchen",
        "booking.select_package": "Paket auswählen",
        "booking.confirm": "Buchung bestätigen",
        "booking.cancel": "Abbrechen",

        // Article
        "article.new": "Neuer Artikel",
        "article.title": "Titel",
        "article.content": "Inhalt",
        "article.preview": "Vorschau",
        "article.save_draft": "Entwurf speichern",
        "article.publish": "Veröffentlichen",
        "article.share_linkedin": "Auf LinkedIn teilen",
        "article.share_twitter": "Auf Twitter teilen",

        // Pro-bono
        "probono.add_slot": "Freien Slot hinzufügen",
        "probono.hours_tracked": "Pro-bono Stunden",

        // Review
        "review.write": "Bewertung schreiben",
        "review.rating": "Bewertung",
        "review.comment": "Ihr Kommentar",
        "review.submit": "Bewertung abschicken",

        // Admin
        "admin.feature_flags": "Feature-Flags",
        "admin.users": "Benutzer",
        "admin.stats": "Statistiken",

        // Profile
        "profile.onboarding": "Profil vervollständigen",
        "profile.update": "Profil aktualisieren",

        // Auth
        "auth.signin": "Anmelden",
        "auth.signup": "Konto erstellen",
        "auth.email": "E-Mail-Adresse",
        "auth.password": "Passwort",
        "auth.selectType": "Ich möchte mich registrieren als:",
        "auth.client": "Klient",
        "auth.clientDesc": "Coaching-Sitzungen finden und buchen",
        "auth.coach": "Coach",
        "auth.coachDesc": "Coaching-Dienstleistungen anbieten",
        "auth.business": "Unternehmen",
        "auth.businessDesc": "Team-Coaching-Bedarf verwalten",

        // Languages
        "lang.english": "Englisch",
        "lang.german": "Deutsch",
        "lang.french": "Französisch",
        "lang.spanish": "Spanisch",
        "lang.italian": "Italienisch",
        "lang.dutch": "Niederländisch",
        "lang.portuguese": "Portugiesisch",
        "lang.polish": "Polnisch",
        "lang.russian": "Russisch",

        // Goals
        "goal.career": "Karriereentwicklung",
        "goal.leadership": "Führungsqualitäten",
        "goal.life": "Work-Life-Balance",
        "goal.health": "Gesundheit & Wellness",
        "goal.relationships": "Beziehungen",
        "goal.business": "Geschäftswachstum",
        "goal.mindset": "Mindset & Selbstvertrauen",
        "goal.financial": "Finanzielle Ziele",

        // Onboarding - General
        "onboard.title": "Vervollständigen Sie Ihr Coach-Profil",
        "onboard.previous": "Zurück",
        "onboard.next": "Weiter →",
        "onboard.complete": "Abschließen",
        "onboard.skipForNow": "Überspringen",
        "onboard.skipConfirm": "Möchten Sie das Onboarding wirklich überspringen? Sie können es später in den Einstellungen abschließen.",
        "onboard.welcomeComplete": "Willkommen an Bord! Ihr Profil ist eingerichtet.",
        "onboard.saveFailed": "Profil konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",

        // Onboarding - Welcome
        "onboard.welcomeTitle": "Willkommen bei CoachSearching!",
        "onboard.welcomeDescCoach": "Lassen Sie uns Ihr Coaching-Profil einrichten und mit Klienten verbinden.",
        "onboard.welcomeDescClient": "Lassen Sie uns Ihre Erfahrung personalisieren und den perfekten Coach für Sie finden.",
        "onboard.quickSetup": "Schnelle Einrichtung",
        "onboard.quickSetupDesc": "Nur 4 einfache Schritte",
        "onboard.autoSave": "Auto-Speichern",
        "onboard.autoSaveDesc": "Ihr Fortschritt wird automatisch gespeichert",
        "onboard.skipAnytime": "Jederzeit überspringen",
        "onboard.skipAnytimeDesc": "Später abschließen wenn nötig",
        "onboard.letsStart": "Los geht's",

        // Onboarding - Steps
        "onboard.step.welcome": "Willkommen",
        "onboard.step.goals": "Ziele",
        "onboard.step.preferences": "Präferenzen",
        "onboard.step.complete": "Fertig",
        "onboard.step.profile": "Profil",
        "onboard.step.specialties": "Fachgebiete",
        "onboard.step.pricing": "Preise",

        // Onboarding - Client
        "onboard.client.step1Title": "Erzählen Sie uns von sich",
        "onboard.client.step1Desc": "Dies hilft uns, Ihre Coaching-Erfahrung zu personalisieren.",
        "onboard.client.step2Title": "Was sind Ihre Ziele?",
        "onboard.client.step2Desc": "Wählen Sie alle zutreffenden aus. Dies hilft uns, Sie mit den richtigen Coaches zu verbinden.",
        "onboard.client.step3Title": "Ihre Präferenzen",
        "onboard.client.step3Desc": "Helfen Sie uns, Coaches zu finden, die zu Ihren Bedürfnissen passen.",
        "onboard.client.completeTitle": "Alles bereit!",
        "onboard.client.completeDesc": "Ihr Profil ist fertig. Finden wir Ihren perfekten Coach!",

        // Onboarding - Coach
        "onboard.coach.step1Title": "Erstellen Sie Ihr Coach-Profil",
        "onboard.coach.step1Desc": "So werden Klienten Sie entdecken.",
        "onboard.coach.step2Title": "Ihre Fachgebiete",
        "onboard.coach.step2Desc": "Fügen Sie Ihre Coaching-Fachgebiete und Sprachen hinzu.",
        "onboard.coach.step3Title": "Ihre Preise festlegen",
        "onboard.coach.step3Desc": "Sie können diese später jederzeit anpassen.",
        "onboard.coach.completeTitle": "Willkommen bei CoachSearching!",
        "onboard.coach.completeDesc": "Ihr Coach-Profil ist fertig. Lassen Sie sich verifizieren und beginnen Sie, mit Klienten in Kontakt zu treten!",

        // Onboarding - Form Fields
        "onboard.displayName": "Wie sollen wir Sie nennen?",
        "onboard.displayNamePlaceholder": "Ihr bevorzugter Name",
        "onboard.location": "Standort",
        "onboard.locationPlaceholder": "Stadt, Land",
        "onboard.aboutYou": "Erzählen Sie uns etwas über sich (optional)",
        "onboard.aboutYouPlaceholder": "Was bringt Sie zu CoachSearching? Was möchten Sie erreichen?",
        "onboard.specificGoals": "Gibt es etwas Bestimmtes, woran Sie arbeiten möchten? (optional)",
        "onboard.specificGoalsPlaceholder": "z.B. Ich möchte meine Karriere wechseln, meine Führungsqualitäten verbessern...",
        "onboard.sessionFormat": "Bevorzugtes Sitzungsformat",
        "onboard.videoCall": "Videoanruf",
        "onboard.inPerson": "Vor Ort",
        "onboard.phoneCall": "Telefonat",
        "onboard.either": "Beides",
        "onboard.budget": "Budgetrahmen (pro Stunde)",
        "onboard.minPrice": "Min €",
        "onboard.maxPrice": "Max €",
        "onboard.to": "bis",
        "onboard.preferredLanguages": "Bevorzugte Sprachen",

        // Onboarding - Coach Profile
        "onboard.profilePicture": "Profilbild",
        "onboard.uploadPhoto": "Klicken oder ziehen zum Hochladen",
        "onboard.uploadHint": "JPG, PNG bis 5MB",
        "onboard.changePhoto": "Foto ändern",
        "onboard.invalidImageType": "Bitte wählen Sie eine Bilddatei",
        "onboard.imageTooLarge": "Das Bild muss kleiner als 5MB sein",
        "onboard.fullName": "Vollständiger Name",
        "onboard.jobTitle": "Berufsbezeichnung",
        "onboard.jobTitlePlaceholder": "z.B. Zertifizierter Life Coach, Business-Stratege",
        "onboard.yearsExperience": "Jahre Erfahrung",
        "onboard.bio": "Professionelle Biografie",
        "onboard.bioHelp": "Erzählen Sie Klienten von Ihrem Hintergrund, Ansatz und was Sie einzigartig macht.",
        "onboard.bioPlaceholder": "Ich bin ein zertifizierter Life Coach mit 5 Jahren Erfahrung, der Fachleuten bei Karrierewechseln hilft...",
        "onboard.characters": "Zeichen",

        // Onboarding - Specialties
        "onboard.specialties": "Ihre Fachgebiete",
        "onboard.specialtiesHelp": "Geben Sie ein Fachgebiet ein und drücken Sie Komma oder Enter",
        "onboard.specialtiesPlaceholder": "z.B. Life Coaching, Karriereentwicklung, Executive Coaching...",
        "onboard.popularSpecialties": "Beliebte Fachgebiete",
        "onboard.pillHint": "Drücken Sie Komma oder Enter zum Hinzufügen",
        "onboard.sessionLanguages": "Sprachen für Sitzungen",

        // Onboarding - Pricing
        "onboard.hourlyRate": "Stundensatz",
        "onboard.hourlyRatePlaceholder": "z.B. 75",
        "onboard.platformFee": "Plattformgebühr",
        "onboard.youReceive": "Sie erhalten",
        "onboard.hour": "Stunde",
        "onboard.sessionDurations": "Sitzungsdauer-Optionen",
        "onboard.sessionFormats": "Angebotene Sitzungsformate",
        "onboard.videoCallDesc": "Online-Sitzungen per Video",
        "onboard.inPersonDesc": "Persönliche Treffen",
        "onboard.phoneCallDesc": "Nur Audio-Sitzungen",
        "onboard.pricingPreview": "Preisvorschau",
        "onboard.sessionPrice": "1-Stunden-Sitzungspreis",

        // Onboarding - On-site Address
        "onboard.onsiteAddress": "Adresse für Vor-Ort-Sitzungen",
        "onboard.onsiteAddressHelp": "Wo werden Sie Klienten für persönliche Sitzungen treffen?",
        "onboard.streetAddress": "Straße",
        "onboard.city": "Stadt",
        "onboard.postalCode": "Postleitzahl",
        "onboard.country": "Land",

        // Onboarding - Completion
        "onboard.profileSummary": "Ihre Profilzusammenfassung",
        "onboard.coachProfile": "Ihr Coach-Profil",
        "onboard.name": "Name",
        "onboard.title": "Titel",
        "onboard.experience": "Erfahrung",
        "onboard.years": "Jahre",
        "onboard.languages": "Sprachen",
        "onboard.goals": "Ziele",
        "onboard.selected": "ausgewählt",
        "onboard.whatNext": "Was kommt als Nächstes?",
        "onboard.nextSteps": "Nächste Schritte",
        "onboard.browseCoaches": "Coaches durchsuchen",
        "onboard.browseCoachesDesc": "Finden Sie Coaches, die zu Ihren Zielen passen",
        "onboard.bookSession": "Sitzung buchen",
        "onboard.bookSessionDesc": "Planen Sie Ihre erste Coaching-Sitzung",
        "onboard.getSupport": "Hilfe erhalten",
        "onboard.getSupportDesc": "Wir sind jederzeit für Sie da",
        "onboard.getVerified": "Verifizieren lassen",
        "onboard.getVerifiedDesc": "Reichen Sie Ihre Nachweise zur Verifizierung ein",
        "onboard.setAvailability": "Verfügbarkeit festlegen",
        "onboard.setAvailabilityDesc": "Fügen Sie Ihre verfügbaren Zeitfenster hinzu",
        "onboard.completeProfile": "Profil vervollständigen",
        "onboard.completeProfileDesc": "Portfolio und Zertifikate hinzufügen",
        "onboard.verifiedBadge": "Lassen Sie sich verifizieren!",
        "onboard.verifiedBadgeDesc": "Verifizierte Coaches erhalten 3x mehr Buchungen. Laden Sie Ihre Nachweise hoch.",
        "onboard.avatar": "Profilbild-URL",
        "onboard.submit": "Profil vervollständigen",
        "onboard.uploading": "Wird gespeichert..."
    },
    es: {
        // Navigation
        "nav.home": "Inicio",
        "nav.coaches": "Buscar Coach",
        "nav.dashboard": "Panel",
        "nav.login": "Entrar",

        // Hero
        "hero.title": "Encuentra tu Coach Perfecto",
        "hero.subtitle": "Coaching profesional para negocios, vida y crecimiento personal.",

        // Search
        "search.placeholder": "Buscar por nombre, título o biografía...",
        "search.btn": "Buscar",
        "search.online": "En línea",
        "search.onsite": "Presencial",
        "search.locationPlaceholder": "Ubicación (ej. Madrid, España)",
        "search.within": "Dentro de",

        // Coach
        "coach.hourly_rate": "Tarifa por hora",
        "coach.book": "Reservar ahora",
        "coach.view_profile": "Ver perfil",
        "coach.reviews": "reseñas",

        // Footer
        "footer.copyright": "© 2025 CoachSearching. Todos los derechos reservados.",

        // Dashboard
        "dashboard.welcome": "Bienvenido",
        "dashboard.overview": "Resumen",
        "dashboard.bookings": "Mis Reservas",
        "dashboard.articles": "Artículos",
        "dashboard.probono": "Sesiones Pro-bono",
        "dashboard.earnings": "Ganancias",
        "dashboard.profile": "Perfil",
        "dashboard.packages": "Paquetes de Sesiones",

        // Booking
        "booking.title": "Reservar Sesión",
        "booking.select_package": "Seleccionar Paquete",
        "booking.confirm": "Confirmar Reserva",
        "booking.cancel": "Cancelar",

        // Article
        "article.new": "Nuevo Artículo",
        "article.title": "Título",
        "article.content": "Contenido",
        "article.preview": "Vista Previa",
        "article.save_draft": "Guardar Borrador",
        "article.publish": "Publicar",
        "article.share_linkedin": "Compartir en LinkedIn",
        "article.share_twitter": "Compartir en Twitter",

        // Pro-bono
        "probono.add_slot": "Agregar Sesión Gratuita",
        "probono.hours_tracked": "Horas Pro-bono",

        // Review
        "review.write": "Escribir Reseña",
        "review.rating": "Calificación",
        "review.comment": "Tu Comentario",
        "review.submit": "Enviar Reseña",

        // Admin
        "admin.feature_flags": "Indicadores de Funciones",
        "admin.users": "Usuarios",
        "admin.stats": "Estadísticas",

        // Profile
        "profile.onboarding": "Completar Perfil",
        "profile.update": "Actualizar Perfil",

        // Auth
        "auth.signin": "Iniciar sesión",
        "auth.signup": "Crear cuenta",
        "auth.email": "Correo electrónico",
        "auth.password": "Contraseña",
        "auth.selectType": "Quiero registrarme como:",
        "auth.client": "Cliente",
        "auth.clientDesc": "Buscar y reservar sesiones de coaching",
        "auth.coach": "Coach",
        "auth.coachDesc": "Ofrecer servicios de coaching",
        "auth.business": "Empresa",
        "auth.businessDesc": "Gestionar necesidades de coaching del equipo",

        // Languages
        "lang.english": "Inglés",
        "lang.german": "Alemán",
        "lang.french": "Francés",
        "lang.spanish": "Español",
        "lang.italian": "Italiano",
        "lang.dutch": "Neerlandés",
        "lang.portuguese": "Portugués",
        "lang.polish": "Polaco",
        "lang.russian": "Ruso",

        // Goals
        "goal.career": "Desarrollo Profesional",
        "goal.leadership": "Habilidades de Liderazgo",
        "goal.life": "Equilibrio de Vida",
        "goal.health": "Salud y Bienestar",
        "goal.relationships": "Relaciones",
        "goal.business": "Crecimiento Empresarial",
        "goal.mindset": "Mentalidad y Confianza",
        "goal.financial": "Metas Financieras",

        // Onboarding - General
        "onboard.title": "Completa tu Perfil de Coach",
        "onboard.previous": "Anterior",
        "onboard.next": "Siguiente →",
        "onboard.complete": "Completar",
        "onboard.skipForNow": "Omitir por ahora",
        "onboard.skipConfirm": "¿Seguro que quieres omitir? Puedes completarlo más tarde desde configuración.",
        "onboard.welcomeComplete": "¡Bienvenido! Tu perfil está listo.",
        "onboard.saveFailed": "Error al guardar tu perfil. Por favor intenta de nuevo.",

        // Onboarding - Welcome
        "onboard.welcomeTitle": "¡Bienvenido a CoachSearching!",
        "onboard.welcomeDescCoach": "Configuremos tu perfil de coaching y comencemos a conectar con clientes.",
        "onboard.welcomeDescClient": "Personalicemos tu experiencia y encontremos el coach perfecto para ti.",
        "onboard.quickSetup": "Configuración Rápida",
        "onboard.quickSetupDesc": "Solo 4 simples pasos",
        "onboard.autoSave": "Auto-Guardado",
        "onboard.autoSaveDesc": "Tu progreso se guarda automáticamente",
        "onboard.skipAnytime": "Omitir en Cualquier Momento",
        "onboard.skipAnytimeDesc": "Complétalo más tarde si lo necesitas",
        "onboard.letsStart": "Comenzar",

        // Onboarding - Steps
        "onboard.step.welcome": "Bienvenida",
        "onboard.step.goals": "Metas",
        "onboard.step.preferences": "Preferencias",
        "onboard.step.complete": "Completar",
        "onboard.step.profile": "Perfil",
        "onboard.step.specialties": "Especialidades",
        "onboard.step.pricing": "Precios",

        // Onboarding - Client
        "onboard.client.step1Title": "Cuéntanos sobre ti",
        "onboard.client.step1Desc": "Esto nos ayuda a personalizar tu experiencia de coaching.",
        "onboard.client.step2Title": "¿Cuáles son tus metas?",
        "onboard.client.step2Desc": "Selecciona todas las que apliquen. Esto nos ayuda a conectarte con los coaches adecuados.",
        "onboard.client.step3Title": "Tus Preferencias",
        "onboard.client.step3Desc": "Ayúdanos a encontrar coaches que se ajusten a tus necesidades.",
        "onboard.client.completeTitle": "¡Todo Listo!",
        "onboard.client.completeDesc": "Tu perfil está listo. ¡Encontremos tu coach perfecto!",

        // Onboarding - Coach
        "onboard.coach.step1Title": "Crea Tu Perfil de Coach",
        "onboard.coach.step1Desc": "Así es como los clientes te descubrirán.",
        "onboard.coach.step2Title": "Tus Especialidades",
        "onboard.coach.step2Desc": "Agrega tus especialidades de coaching e idiomas.",
        "onboard.coach.step3Title": "Establece Tus Tarifas",
        "onboard.coach.step3Desc": "Siempre puedes ajustarlas después.",
        "onboard.coach.completeTitle": "¡Bienvenido a CoachSearching!",
        "onboard.coach.completeDesc": "Tu perfil de coach está listo. ¡Verifícate y comienza a conectar con clientes!",

        // Onboarding - Form Fields
        "onboard.displayName": "¿Cómo te llamamos?",
        "onboard.displayNamePlaceholder": "Tu nombre preferido",
        "onboard.location": "Ubicación",
        "onboard.locationPlaceholder": "Ciudad, País",
        "onboard.aboutYou": "Cuéntanos un poco sobre ti (opcional)",
        "onboard.aboutYouPlaceholder": "¿Qué te trae a CoachSearching? ¿Qué quieres lograr?",
        "onboard.specificGoals": "¿Algo específico en lo que te gustaría trabajar? (opcional)",
        "onboard.specificGoalsPlaceholder": "ej. Quiero cambiar de carrera, mejorar mis habilidades de liderazgo...",
        "onboard.sessionFormat": "Formato de Sesión Preferido",
        "onboard.videoCall": "Videollamada",
        "onboard.inPerson": "Presencial",
        "onboard.phoneCall": "Llamada Telefónica",
        "onboard.either": "Cualquiera",
        "onboard.budget": "Rango de Presupuesto (por hora)",
        "onboard.minPrice": "Mín €",
        "onboard.maxPrice": "Máx €",
        "onboard.to": "a",
        "onboard.preferredLanguages": "Idiomas Preferidos",

        // Onboarding - Coach Profile
        "onboard.profilePicture": "Foto de Perfil",
        "onboard.uploadPhoto": "Clic o arrastra para subir",
        "onboard.uploadHint": "JPG, PNG hasta 5MB",
        "onboard.changePhoto": "Cambiar foto",
        "onboard.invalidImageType": "Por favor selecciona un archivo de imagen",
        "onboard.imageTooLarge": "La imagen debe ser menor a 5MB",
        "onboard.fullName": "Nombre Completo",
        "onboard.jobTitle": "Título Profesional",
        "onboard.jobTitlePlaceholder": "ej. Coach de Vida Certificado, Estratega de Negocios",
        "onboard.yearsExperience": "Años de Experiencia",
        "onboard.bio": "Biografía Profesional",
        "onboard.bioHelp": "Cuéntale a los clientes sobre tu experiencia, enfoque y qué te hace único.",
        "onboard.bioPlaceholder": "Soy un coach de vida certificado con 5 años de experiencia ayudando a profesionales...",
        "onboard.characters": "caracteres",

        // Onboarding - Specialties
        "onboard.specialties": "Tus Especialidades",
        "onboard.specialtiesHelp": "Escribe una especialidad y presiona coma o Enter para agregar",
        "onboard.specialtiesPlaceholder": "ej. Coaching de Vida, Desarrollo de Carrera, Coaching Ejecutivo...",
        "onboard.popularSpecialties": "Especialidades populares",
        "onboard.pillHint": "Presiona coma o Enter para agregar",
        "onboard.sessionLanguages": "Idiomas en que Ofreces Sesiones",

        // Onboarding - Pricing
        "onboard.hourlyRate": "Tarifa por Hora",
        "onboard.hourlyRatePlaceholder": "ej. 75",
        "onboard.platformFee": "Comisión de plataforma",
        "onboard.youReceive": "Recibirás",
        "onboard.hour": "hora",
        "onboard.sessionDurations": "Opciones de Duración de Sesión",
        "onboard.sessionFormats": "Formatos de Sesión que Ofreces",
        "onboard.videoCallDesc": "Sesiones online por video",
        "onboard.inPersonDesc": "Sesiones cara a cara",
        "onboard.phoneCallDesc": "Sesiones solo audio",
        "onboard.pricingPreview": "Vista Previa de Precios",
        "onboard.sessionPrice": "Precio sesión de 1 hora",

        // Onboarding - On-site Address
        "onboard.onsiteAddress": "Dirección para Sesiones Presenciales",
        "onboard.onsiteAddressHelp": "¿Dónde te reunirás con clientes para sesiones presenciales?",
        "onboard.streetAddress": "Dirección",
        "onboard.city": "Ciudad",
        "onboard.postalCode": "Código postal",
        "onboard.country": "País",

        // Onboarding - Completion
        "onboard.profileSummary": "Resumen de Tu Perfil",
        "onboard.coachProfile": "Tu Perfil de Coach",
        "onboard.name": "Nombre",
        "onboard.title": "Título",
        "onboard.experience": "Experiencia",
        "onboard.years": "años",
        "onboard.languages": "Idiomas",
        "onboard.goals": "Metas",
        "onboard.selected": "seleccionadas",
        "onboard.whatNext": "¿Qué Sigue?",
        "onboard.nextSteps": "Próximos Pasos",
        "onboard.browseCoaches": "Explorar Coaches",
        "onboard.browseCoachesDesc": "Encuentra coaches que coincidan con tus metas",
        "onboard.bookSession": "Reservar Sesión",
        "onboard.bookSessionDesc": "Programa tu primera sesión de coaching",
        "onboard.getSupport": "Obtener Ayuda",
        "onboard.getSupportDesc": "Estamos aquí para ayudarte",
        "onboard.getVerified": "Verificarte",
        "onboard.getVerifiedDesc": "Envía tus credenciales para verificación",
        "onboard.setAvailability": "Establecer Disponibilidad",
        "onboard.setAvailabilityDesc": "Agrega tus horarios disponibles",
        "onboard.completeProfile": "Completar Perfil",
        "onboard.completeProfileDesc": "Agrega portafolio y certificaciones",
        "onboard.verifiedBadge": "¡Verifícate para Destacar!",
        "onboard.verifiedBadgeDesc": "Los coaches verificados reciben 3x más reservas. Sube tus credenciales.",
        "onboard.avatar": "URL de foto de perfil",
        "onboard.submit": "Completar perfil",
        "onboard.uploading": "Guardando..."
    },
    fr: {
        // Navigation
        "nav.home": "Accueil",
        "nav.coaches": "Trouver un Coach",
        "nav.dashboard": "Tableau de bord",
        "nav.login": "Connexion",

        // Hero
        "hero.title": "Trouvez votre Coach Idéal",
        "hero.subtitle": "Coaching professionnel pour les affaires, la vie et la croissance personnelle.",

        // Search
        "search.placeholder": "Rechercher par nom, titre ou bio...",
        "search.btn": "Rechercher",
        "search.online": "En ligne",
        "search.onsite": "Sur place",
        "search.locationPlaceholder": "Localisation (ex. Paris, France)",
        "search.within": "Dans un rayon de",

        // Coach
        "coach.hourly_rate": "Taux horaire",
        "coach.book": "Réserver maintenant",
        "coach.view_profile": "Voir le profil",
        "coach.reviews": "avis",

        // Footer
        "footer.copyright": "© 2025 CoachSearching. Tous droits réservés.",

        // Dashboard
        "dashboard.welcome": "Bienvenue",
        "dashboard.overview": "Aperçu",
        "dashboard.bookings": "Mes Réservations",
        "dashboard.articles": "Articles",
        "dashboard.probono": "Séances Pro-bono",
        "dashboard.earnings": "Revenus",
        "dashboard.profile": "Profil",
        "dashboard.packages": "Forfaits de Séances",

        // Booking
        "booking.title": "Réserver une Séance",
        "booking.select_package": "Sélectionner un Forfait",
        "booking.confirm": "Confirmer la Réservation",
        "booking.cancel": "Annuler",

        // Article
        "article.new": "Nouvel Article",
        "article.title": "Titre",
        "article.content": "Contenu",
        "article.preview": "Aperçu",
        "article.save_draft": "Enregistrer le Brouillon",
        "article.publish": "Publier",
        "article.share_linkedin": "Partager sur LinkedIn",
        "article.share_twitter": "Partager sur Twitter",

        // Pro-bono
        "probono.add_slot": "Ajouter un Créneau Gratuit",
        "probono.hours_tracked": "Heures Pro-bono",

        // Review
        "review.write": "Écrire un Avis",
        "review.rating": "Évaluation",
        "review.comment": "Votre Commentaire",
        "review.submit": "Soumettre l'Avis",

        // Admin
        "admin.feature_flags": "Indicateurs de Fonctionnalités",
        "admin.users": "Utilisateurs",
        "admin.stats": "Statistiques",

        // Profile
        "profile.onboarding": "Compléter le Profil",
        "profile.update": "Mettre à jour le Profil",

        // Auth
        "auth.signin": "Se connecter",
        "auth.signup": "Créer un compte",
        "auth.email": "Adresse e-mail",
        "auth.password": "Mot de passe",
        "auth.selectType": "Je veux m'inscrire en tant que:",
        "auth.client": "Client",
        "auth.clientDesc": "Trouver et réserver des séances",
        "auth.coach": "Coach",
        "auth.coachDesc": "Offrir des services de coaching",
        "auth.business": "Entreprise",
        "auth.businessDesc": "Gérer les besoins d'équipe",

        // Languages
        "lang.english": "Anglais",
        "lang.german": "Allemand",
        "lang.french": "Français",
        "lang.spanish": "Espagnol",
        "lang.italian": "Italien",
        "lang.dutch": "Néerlandais",
        "lang.portuguese": "Portugais",
        "lang.polish": "Polonais",
        "lang.russian": "Russe",

        // Goals
        "goal.career": "Développement de Carrière",
        "goal.leadership": "Compétences en Leadership",
        "goal.life": "Équilibre de Vie",
        "goal.health": "Santé et Bien-être",
        "goal.relationships": "Relations",
        "goal.business": "Croissance d'Entreprise",
        "goal.mindset": "État d'Esprit et Confiance",
        "goal.financial": "Objectifs Financiers",

        // Onboarding - General
        "onboard.title": "Complétez votre Profil de Coach",
        "onboard.previous": "Précédent",
        "onboard.next": "Suivant →",
        "onboard.complete": "Terminer",
        "onboard.skipForNow": "Passer pour l'instant",
        "onboard.skipConfirm": "Voulez-vous vraiment passer? Vous pourrez compléter plus tard dans les paramètres.",
        "onboard.welcomeComplete": "Bienvenue! Votre profil est prêt.",
        "onboard.saveFailed": "Échec de l'enregistrement. Veuillez réessayer.",

        // Onboarding - Welcome
        "onboard.welcomeTitle": "Bienvenue sur CoachSearching!",
        "onboard.welcomeDescCoach": "Configurons votre profil de coaching et commençons à vous connecter avec des clients.",
        "onboard.welcomeDescClient": "Personnalisons votre expérience et trouvons le coach parfait pour vous.",
        "onboard.quickSetup": "Configuration Rapide",
        "onboard.quickSetupDesc": "Seulement 4 étapes simples",
        "onboard.autoSave": "Sauvegarde Auto",
        "onboard.autoSaveDesc": "Votre progression est sauvegardée automatiquement",
        "onboard.skipAnytime": "Passer à Tout Moment",
        "onboard.skipAnytimeDesc": "Complétez plus tard si nécessaire",
        "onboard.letsStart": "Commencer",

        // Onboarding - Steps
        "onboard.step.welcome": "Bienvenue",
        "onboard.step.goals": "Objectifs",
        "onboard.step.preferences": "Préférences",
        "onboard.step.complete": "Terminer",
        "onboard.step.profile": "Profil",
        "onboard.step.specialties": "Spécialités",
        "onboard.step.pricing": "Tarifs",

        // Onboarding - Client
        "onboard.client.step1Title": "Parlez-nous de vous",
        "onboard.client.step1Desc": "Cela nous aide à personnaliser votre expérience de coaching.",
        "onboard.client.step2Title": "Quels sont vos objectifs?",
        "onboard.client.step2Desc": "Sélectionnez tout ce qui s'applique. Cela nous aide à vous connecter avec les bons coachs.",
        "onboard.client.step3Title": "Vos Préférences",
        "onboard.client.step3Desc": "Aidez-nous à trouver des coachs qui correspondent à vos besoins.",
        "onboard.client.completeTitle": "Tout est Prêt!",
        "onboard.client.completeDesc": "Votre profil est prêt. Trouvons votre coach parfait!",

        // Onboarding - Coach
        "onboard.coach.step1Title": "Créez Votre Profil de Coach",
        "onboard.coach.step1Desc": "C'est ainsi que les clients vous découvriront.",
        "onboard.coach.step2Title": "Vos Spécialités",
        "onboard.coach.step2Desc": "Ajoutez vos spécialités de coaching et langues.",
        "onboard.coach.step3Title": "Définissez Vos Tarifs",
        "onboard.coach.step3Desc": "Vous pouvez toujours les ajuster plus tard.",
        "onboard.coach.completeTitle": "Bienvenue sur CoachSearching!",
        "onboard.coach.completeDesc": "Votre profil de coach est prêt. Faites-vous vérifier et commencez à vous connecter avec des clients!",

        // Onboarding - Form Fields
        "onboard.displayName": "Comment devons-nous vous appeler?",
        "onboard.displayNamePlaceholder": "Votre nom préféré",
        "onboard.location": "Localisation",
        "onboard.locationPlaceholder": "Ville, Pays",
        "onboard.aboutYou": "Parlez-nous un peu de vous (optionnel)",
        "onboard.aboutYouPlaceholder": "Qu'est-ce qui vous amène sur CoachSearching? Que voulez-vous accomplir?",
        "onboard.specificGoals": "Quelque chose de spécifique sur lequel vous aimeriez travailler? (optionnel)",
        "onboard.specificGoalsPlaceholder": "ex. Je veux changer de carrière, améliorer mes compétences en leadership...",
        "onboard.sessionFormat": "Format de Séance Préféré",
        "onboard.videoCall": "Appel Vidéo",
        "onboard.inPerson": "En Personne",
        "onboard.phoneCall": "Appel Téléphonique",
        "onboard.either": "Les Deux",
        "onboard.budget": "Fourchette de Budget (par heure)",
        "onboard.minPrice": "Min €",
        "onboard.maxPrice": "Max €",
        "onboard.to": "à",
        "onboard.preferredLanguages": "Langues Préférées",

        // Onboarding - Coach Profile
        "onboard.profilePicture": "Photo de Profil",
        "onboard.uploadPhoto": "Cliquez ou glissez pour télécharger",
        "onboard.uploadHint": "JPG, PNG jusqu'à 5MB",
        "onboard.changePhoto": "Changer la photo",
        "onboard.invalidImageType": "Veuillez sélectionner un fichier image",
        "onboard.imageTooLarge": "L'image doit faire moins de 5MB",
        "onboard.fullName": "Nom Complet",
        "onboard.jobTitle": "Titre Professionnel",
        "onboard.jobTitlePlaceholder": "ex. Coach de Vie Certifié, Stratège d'Entreprise",
        "onboard.yearsExperience": "Années d'Expérience",
        "onboard.bio": "Biographie Professionnelle",
        "onboard.bioHelp": "Parlez aux clients de votre parcours, approche et ce qui vous rend unique.",
        "onboard.bioPlaceholder": "Je suis un coach de vie certifié avec 5 ans d'expérience aidant les professionnels...",
        "onboard.characters": "caractères",

        // Onboarding - Specialties
        "onboard.specialties": "Vos Spécialités",
        "onboard.specialtiesHelp": "Tapez une spécialité et appuyez sur virgule ou Entrée pour ajouter",
        "onboard.specialtiesPlaceholder": "ex. Coaching de Vie, Développement de Carrière, Coaching Exécutif...",
        "onboard.popularSpecialties": "Spécialités populaires",
        "onboard.pillHint": "Appuyez sur virgule ou Entrée pour ajouter",
        "onboard.sessionLanguages": "Langues dans lesquelles vous Offrez des Séances",

        // Onboarding - Pricing
        "onboard.hourlyRate": "Taux Horaire",
        "onboard.hourlyRatePlaceholder": "ex. 75",
        "onboard.platformFee": "Frais de plateforme",
        "onboard.youReceive": "Vous recevrez",
        "onboard.hour": "heure",
        "onboard.sessionDurations": "Options de Durée de Séance",
        "onboard.sessionFormats": "Formats de Séance que vous Offrez",
        "onboard.videoCallDesc": "Séances en ligne par vidéo",
        "onboard.inPersonDesc": "Séances en face à face",
        "onboard.phoneCallDesc": "Séances audio uniquement",
        "onboard.pricingPreview": "Aperçu des Tarifs",
        "onboard.sessionPrice": "Prix séance d'1 heure",

        // Onboarding - On-site Address
        "onboard.onsiteAddress": "Adresse pour Séances en Personne",
        "onboard.onsiteAddressHelp": "Où rencontrerez-vous les clients pour les séances en personne?",
        "onboard.streetAddress": "Adresse",
        "onboard.city": "Ville",
        "onboard.postalCode": "Code postal",
        "onboard.country": "Pays",

        // Onboarding - Completion
        "onboard.profileSummary": "Résumé de Votre Profil",
        "onboard.coachProfile": "Votre Profil de Coach",
        "onboard.name": "Nom",
        "onboard.title": "Titre",
        "onboard.experience": "Expérience",
        "onboard.years": "ans",
        "onboard.languages": "Langues",
        "onboard.goals": "Objectifs",
        "onboard.selected": "sélectionnés",
        "onboard.whatNext": "Et Maintenant?",
        "onboard.nextSteps": "Prochaines Étapes",
        "onboard.browseCoaches": "Parcourir les Coachs",
        "onboard.browseCoachesDesc": "Trouvez des coachs qui correspondent à vos objectifs",
        "onboard.bookSession": "Réserver une Séance",
        "onboard.bookSessionDesc": "Planifiez votre première séance de coaching",
        "onboard.getSupport": "Obtenir de l'Aide",
        "onboard.getSupportDesc": "Nous sommes là pour vous aider",
        "onboard.getVerified": "Se Faire Vérifier",
        "onboard.getVerifiedDesc": "Soumettez vos credentials pour vérification",
        "onboard.setAvailability": "Définir la Disponibilité",
        "onboard.setAvailabilityDesc": "Ajoutez vos créneaux disponibles",
        "onboard.completeProfile": "Compléter le Profil",
        "onboard.completeProfileDesc": "Ajoutez portfolio et certifications",
        "onboard.verifiedBadge": "Faites-vous Vérifier pour vous Démarquer!",
        "onboard.verifiedBadgeDesc": "Les coachs vérifiés reçoivent 3x plus de réservations. Téléchargez vos credentials.",
        "onboard.avatar": "URL photo de profil",
        "onboard.submit": "Compléter le profil",
        "onboard.uploading": "Enregistrement..."
    },
    it: {
        // Navigation
        "nav.home": "Home",
        "nav.coaches": "Trova un Coach",
        "nav.dashboard": "Dashboard",
        "nav.login": "Accedi",

        // Hero
        "hero.title": "Trova il tuo Coach Perfetto",
        "hero.subtitle": "Coaching professionale per affari, vita e crescita personale.",

        // Search
        "search.placeholder": "Cerca per nome, titolo o bio...",
        "search.btn": "Cerca",
        "search.online": "Online",
        "search.onsite": "In presenza",
        "search.locationPlaceholder": "Posizione (es. Roma, Italia)",
        "search.within": "Entro",

        // Coach
        "coach.hourly_rate": "Tariffa oraria",
        "coach.book": "Prenota ora",
        "coach.view_profile": "Vedi profilo",
        "coach.reviews": "recensioni",

        // Footer
        "footer.copyright": "© 2025 CoachSearching. Tutti i diritti riservati.",

        // Dashboard
        "dashboard.welcome": "Benvenuto",
        "dashboard.overview": "Panoramica",
        "dashboard.bookings": "Le Mie Prenotazioni",
        "dashboard.articles": "Articoli",
        "dashboard.probono": "Sessioni Pro-bono",
        "dashboard.earnings": "Guadagni",
        "dashboard.profile": "Profilo",
        "dashboard.packages": "Pacchetti di Sessioni",

        // Booking
        "booking.title": "Prenota una Sessione",
        "booking.select_package": "Seleziona un Pacchetto",
        "booking.confirm": "Conferma Prenotazione",
        "booking.cancel": "Annulla",

        // Article
        "article.new": "Nuovo Articolo",
        "article.title": "Titolo",
        "article.content": "Contenuto",
        "article.preview": "Anteprima",
        "article.save_draft": "Salva Bozza",
        "article.publish": "Pubblica",
        "article.share_linkedin": "Condividi su LinkedIn",
        "article.share_twitter": "Condividi su Twitter",

        // Pro-bono
        "probono.add_slot": "Aggiungi Slot Gratuito",
        "probono.hours_tracked": "Ore Pro-bono",

        // Review
        "review.write": "Scrivi una Recensione",
        "review.rating": "Valutazione",
        "review.comment": "Il Tuo Commento",
        "review.submit": "Invia Recensione",

        // Admin
        "admin.feature_flags": "Flag delle Funzionalità",
        "admin.users": "Utenti",
        "admin.stats": "Statistiche",

        // Profile
        "profile.onboarding": "Completa il Profilo",
        "profile.update": "Aggiorna Profilo",

        // Auth
        "auth.signin": "Accedi",
        "auth.signup": "Crea account",
        "auth.email": "Indirizzo email",
        "auth.password": "Password",
        "auth.selectType": "Voglio registrarmi come:",
        "auth.client": "Cliente",
        "auth.clientDesc": "Trova e prenota sessioni di coaching",
        "auth.coach": "Coach",
        "auth.coachDesc": "Offri servizi di coaching",
        "auth.business": "Azienda",
        "auth.businessDesc": "Gestisci esigenze di coaching del team",

        // Languages
        "lang.english": "Inglese",
        "lang.german": "Tedesco",
        "lang.french": "Francese",
        "lang.spanish": "Spagnolo",
        "lang.italian": "Italiano",
        "lang.dutch": "Olandese",
        "lang.portuguese": "Portoghese",
        "lang.polish": "Polacco",
        "lang.russian": "Russo",

        // Goals
        "goal.career": "Sviluppo Carriera",
        "goal.leadership": "Capacità di Leadership",
        "goal.life": "Equilibrio di Vita",
        "goal.health": "Salute e Benessere",
        "goal.relationships": "Relazioni",
        "goal.business": "Crescita Aziendale",
        "goal.mindset": "Mentalità e Fiducia",
        "goal.financial": "Obiettivi Finanziari",

        // Onboarding - General
        "onboard.title": "Completa il tuo Profilo da Coach",
        "onboard.previous": "Precedente",
        "onboard.next": "Avanti →",
        "onboard.complete": "Completa",
        "onboard.skipForNow": "Salta per ora",
        "onboard.skipConfirm": "Sei sicuro di voler saltare? Puoi completare più tardi dalle impostazioni.",
        "onboard.welcomeComplete": "Benvenuto! Il tuo profilo è pronto.",
        "onboard.saveFailed": "Impossibile salvare il profilo. Riprova.",

        // Onboarding - Welcome
        "onboard.welcomeTitle": "Benvenuto su CoachSearching!",
        "onboard.welcomeDescCoach": "Configuriamo il tuo profilo di coaching e iniziamo a connetterti con i clienti.",
        "onboard.welcomeDescClient": "Personalizziamo la tua esperienza e troviamo il coach perfetto per te.",
        "onboard.quickSetup": "Configurazione Rapida",
        "onboard.quickSetupDesc": "Solo 4 semplici passi",
        "onboard.autoSave": "Salvataggio Auto",
        "onboard.autoSaveDesc": "I tuoi progressi sono salvati automaticamente",
        "onboard.skipAnytime": "Salta in Qualsiasi Momento",
        "onboard.skipAnytimeDesc": "Completa più tardi se necessario",
        "onboard.letsStart": "Iniziamo",

        // Onboarding - Steps
        "onboard.step.welcome": "Benvenuto",
        "onboard.step.goals": "Obiettivi",
        "onboard.step.preferences": "Preferenze",
        "onboard.step.complete": "Completa",
        "onboard.step.profile": "Profilo",
        "onboard.step.specialties": "Specialità",
        "onboard.step.pricing": "Prezzi",

        // Onboarding - Client
        "onboard.client.step1Title": "Raccontaci di te",
        "onboard.client.step1Desc": "Questo ci aiuta a personalizzare la tua esperienza di coaching.",
        "onboard.client.step2Title": "Quali sono i tuoi obiettivi?",
        "onboard.client.step2Desc": "Seleziona tutti quelli che si applicano. Ci aiuta a connetterti con i coach giusti.",
        "onboard.client.step3Title": "Le Tue Preferenze",
        "onboard.client.step3Desc": "Aiutaci a trovare coach che corrispondano alle tue esigenze.",
        "onboard.client.completeTitle": "Tutto Pronto!",
        "onboard.client.completeDesc": "Il tuo profilo è pronto. Troviamo il tuo coach perfetto!",

        // Onboarding - Coach
        "onboard.coach.step1Title": "Crea il Tuo Profilo da Coach",
        "onboard.coach.step1Desc": "È così che i clienti ti scopriranno.",
        "onboard.coach.step2Title": "Le Tue Specialità",
        "onboard.coach.step2Desc": "Aggiungi le tue specialità di coaching e lingue.",
        "onboard.coach.step3Title": "Imposta le Tue Tariffe",
        "onboard.coach.step3Desc": "Puoi sempre modificarle in seguito.",
        "onboard.coach.completeTitle": "Benvenuto su CoachSearching!",
        "onboard.coach.completeDesc": "Il tuo profilo da coach è pronto. Fatti verificare e inizia a connetterti con i clienti!",

        // Onboarding - Form Fields
        "onboard.displayName": "Come dovremmo chiamarti?",
        "onboard.displayNamePlaceholder": "Il tuo nome preferito",
        "onboard.location": "Posizione",
        "onboard.locationPlaceholder": "Città, Paese",
        "onboard.aboutYou": "Raccontaci un po' di te (opzionale)",
        "onboard.aboutYouPlaceholder": "Cosa ti porta su CoachSearching? Cosa vuoi raggiungere?",
        "onboard.specificGoals": "Qualcosa di specifico su cui vorresti lavorare? (opzionale)",
        "onboard.specificGoalsPlaceholder": "es. Voglio cambiare carriera, migliorare le mie capacità di leadership...",
        "onboard.sessionFormat": "Formato Sessione Preferito",
        "onboard.videoCall": "Videochiamata",
        "onboard.inPerson": "Di Persona",
        "onboard.phoneCall": "Telefonata",
        "onboard.either": "Entrambi",
        "onboard.budget": "Budget (all'ora)",
        "onboard.minPrice": "Min €",
        "onboard.maxPrice": "Max €",
        "onboard.to": "a",
        "onboard.preferredLanguages": "Lingue Preferite",

        // Onboarding - Coach Profile
        "onboard.profilePicture": "Foto Profilo",
        "onboard.uploadPhoto": "Clicca o trascina per caricare",
        "onboard.uploadHint": "JPG, PNG fino a 5MB",
        "onboard.changePhoto": "Cambia foto",
        "onboard.invalidImageType": "Seleziona un file immagine",
        "onboard.imageTooLarge": "L'immagine deve essere inferiore a 5MB",
        "onboard.fullName": "Nome Completo",
        "onboard.jobTitle": "Titolo Professionale",
        "onboard.jobTitlePlaceholder": "es. Life Coach Certificato, Stratega Aziendale",
        "onboard.yearsExperience": "Anni di Esperienza",
        "onboard.bio": "Biografia Professionale",
        "onboard.bioHelp": "Racconta ai clienti il tuo background, approccio e cosa ti rende unico.",
        "onboard.bioPlaceholder": "Sono un life coach certificato con 5 anni di esperienza nell'aiutare i professionisti...",
        "onboard.characters": "caratteri",

        // Onboarding - Specialties
        "onboard.specialties": "Le Tue Specialità",
        "onboard.specialtiesHelp": "Digita una specialità e premi virgola o Invio per aggiungere",
        "onboard.specialtiesPlaceholder": "es. Life Coaching, Sviluppo Carriera, Executive Coaching...",
        "onboard.popularSpecialties": "Specialità popolari",
        "onboard.pillHint": "Premi virgola o Invio per aggiungere",
        "onboard.sessionLanguages": "Lingue in cui Offri Sessioni",

        // Onboarding - Pricing
        "onboard.hourlyRate": "Tariffa Oraria",
        "onboard.hourlyRatePlaceholder": "es. 75",
        "onboard.platformFee": "Commissione piattaforma",
        "onboard.youReceive": "Riceverai",
        "onboard.hour": "ora",
        "onboard.sessionDurations": "Opzioni Durata Sessione",
        "onboard.sessionFormats": "Formati Sessione che Offri",
        "onboard.videoCallDesc": "Sessioni online via video",
        "onboard.inPersonDesc": "Sessioni faccia a faccia",
        "onboard.phoneCallDesc": "Sessioni solo audio",
        "onboard.pricingPreview": "Anteprima Prezzi",
        "onboard.sessionPrice": "Prezzo sessione 1 ora",

        // Onboarding - On-site Address
        "onboard.onsiteAddress": "Indirizzo per Sessioni di Persona",
        "onboard.onsiteAddressHelp": "Dove incontrerai i clienti per le sessioni di persona?",
        "onboard.streetAddress": "Indirizzo",
        "onboard.city": "Città",
        "onboard.postalCode": "CAP",
        "onboard.country": "Paese",

        // Onboarding - Completion
        "onboard.profileSummary": "Riepilogo del Tuo Profilo",
        "onboard.coachProfile": "Il Tuo Profilo da Coach",
        "onboard.name": "Nome",
        "onboard.title": "Titolo",
        "onboard.experience": "Esperienza",
        "onboard.years": "anni",
        "onboard.languages": "Lingue",
        "onboard.goals": "Obiettivi",
        "onboard.selected": "selezionati",
        "onboard.whatNext": "E Adesso?",
        "onboard.nextSteps": "Prossimi Passi",
        "onboard.browseCoaches": "Sfoglia i Coach",
        "onboard.browseCoachesDesc": "Trova coach che corrispondano ai tuoi obiettivi",
        "onboard.bookSession": "Prenota una Sessione",
        "onboard.bookSessionDesc": "Pianifica la tua prima sessione di coaching",
        "onboard.getSupport": "Ottieni Supporto",
        "onboard.getSupportDesc": "Siamo qui per aiutarti",
        "onboard.getVerified": "Fatti Verificare",
        "onboard.getVerifiedDesc": "Invia le tue credenziali per la verifica",
        "onboard.setAvailability": "Imposta Disponibilità",
        "onboard.setAvailabilityDesc": "Aggiungi i tuoi slot disponibili",
        "onboard.completeProfile": "Completa il Profilo",
        "onboard.completeProfileDesc": "Aggiungi portfolio e certificazioni",
        "onboard.verifiedBadge": "Fatti Verificare per Distinguerti!",
        "onboard.verifiedBadgeDesc": "I coach verificati ricevono 3x più prenotazioni. Carica le tue credenziali.",
        "onboard.avatar": "URL foto profilo",
        "onboard.submit": "Completa profilo",
        "onboard.uploading": "Salvataggio..."
    }
};

let currentLang = 'en';

export function setLanguage(lang) {
    if (translations[lang]) {
        console.log('LANG: Changing language from', currentLang, 'to', lang);
        currentLang = lang;
        localStorage.setItem('lang', lang);
        console.log('LANG: Dispatching langChange event');
        window.dispatchEvent(new Event('langChange'));
        console.log('LANG: Language change complete');
    } else {
        console.error('LANG: Invalid language code:', lang);
    }
}

export function t(key) {
    return translations[currentLang][key] || translations['en'][key] || key;
}

export function getCurrentLang() {
    return currentLang;
}

export function initLanguage() {
    const saved = localStorage.getItem('lang');
    if (saved && translations[saved]) {
        currentLang = saved;
    } else {
        const browserLang = navigator.language.split('-')[0];
        if (translations[browserLang]) {
            currentLang = browserLang;
        }
    }
}

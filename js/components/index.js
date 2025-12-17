/**
 * Components Barrel Export
 */

// Layout components
export { Navbar, Footer, Layout } from './layout/index.js';

// UI components
export { Modal, LegalModal, CurrencySelector, LanguageSelector } from './ui/index.js';

// Common components
export {
    Spinner,
    PageLoading,
    Skeleton,
    CardSkeleton,
    Button,
    IconButton,
    Alert,
    EmailVerificationBanner
} from './common/index.js';

// Router
export {
    RouterProvider,
    useRouter,
    useNavigate,
    useParams,
    Route,
    Switch,
    Link,
    Redirect
} from './Router.js';

// Coach components
export {
    LanguageFlags,
    TrustBadges,
    VideoPopup,
    ReviewsPopup,
    DiscoveryCallModal,
    CoachCard,
    CoachCardSkeleton,
    FilterSidebar,
    SPECIALTY_OPTIONS,
    LANGUAGE_OPTIONS
} from './coach/index.js';

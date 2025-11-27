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

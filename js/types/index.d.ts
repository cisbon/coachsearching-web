/**
 * Global Type Definitions for CoachSearching Platform
 * @fileoverview Comprehensive TypeScript definitions for the coaching marketplace
 */

// ============================================================================
// Global Window Extensions
// ============================================================================

declare global {
  interface Window {
    React: typeof import('react');
    ReactDOM: typeof import('react-dom');
    supabase: {
      createClient: (url: string, key: string) => SupabaseClient;
    };
    supabaseClient: SupabaseClient | null;
    CONFIG: AppConfig;
    promoCodeTimeout?: NodeJS.Timeout;
  }
}

// ============================================================================
// Application Configuration
// ============================================================================

interface Currency {
  symbol: string;
  rate: number;
}

interface AppConfig {
  API_BASE: string;
  ENV_URL: string;
  CURRENCIES: Record<string, Currency>;
  DEFAULT_CURRENCY: string;
  DEFAULT_LANGUAGE: string;
  COACHES_PER_PAGE: number;
  REVIEWS_PER_PAGE: number;
  SESSION_DURATIONS: number[];
  PLATFORM_FEE_PERCENT: number;
  FOUNDING_COACH_FEE_PERCENT: number;
  ROUTES: Record<string, string>;
}

// ============================================================================
// User & Authentication Types
// ============================================================================

type UserRole = 'client' | 'coach' | 'admin' | 'business';

// ---------------------------------------------------------------------------
// profile_data JSONB shapes (stored in cs_users.profile_data, new schema)
// ---------------------------------------------------------------------------

interface CoachProfileData {
  title?: string;
  bio?: string;
  title_en?: string;
  bio_en?: string;
  primary_profile_language?: string;
  specialties?: string[];
  years_experience?: number;
  languages?: string[];
  session_types?: string[];
  hourly_rate?: number;
  currency?: string;
  is_verified?: boolean;
  is_featured?: boolean;
  profile_completion_percentage?: number;
  total_sessions_completed?: number;
  profile_views?: number;
  city_id?: number;
  banner_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  intro_video_url?: string;
  website_url?: string;
  offers_free_discovery?: boolean;
}

interface ClientProfileData {
  preferred_coach_types?: string[];
  preferred_specialties?: string[];
  preferred_languages?: string[];
  budget_range_min?: number;
  budget_range_max?: number;
  currency?: string;
  timezone?: string;
  preferred_meeting_type?: string;
  total_bookings?: number;
  total_completed_sessions?: number;
  total_amount_spent?: number;
  banner_url?: string;
}

type ProfileData = CoachProfileData | ClientProfileData | Record<string, unknown>;

// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  /** Unique URL slug (used for public profile links) */
  slug?: string;
  role: UserRole;
  user_type: UserRole;
  is_verified: boolean;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  language_preference?: string;
  timezone?: string;
  currency?: string;
  /** All role-specific display fields consolidated here (new schema) */
  profile_data: ProfileData;
  created_at: string;
  updated_at: string;
}

interface Session {
  user: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    user_metadata: {
      user_type?: UserRole;
      full_name?: string;
      avatar_url?: string;
    };
  };
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// ============================================================================
// Coach Types
// ============================================================================

type SessionType = 'online' | 'onsite';

/**
 * Coach as returned by the coach_profiles Supabase VIEW (new schema).
 * The view flattens cs_users + cs_coaches + profile_data JSONB into one row.
 */
interface Coach {
  // From cs_users
  id: string;               // = user UUID
  email: string;
  full_name: string;
  avatar_url?: string;
  slug?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Promoted from profile_data JSONB by the view
  title?: string;
  bio?: string;
  title_en?: string;
  bio_en?: string;
  primary_profile_language?: string;
  specialties: string[];
  years_experience?: number;
  languages: string[];
  session_types: string[];
  hourly_rate?: number;
  currency: string;
  is_featured: boolean;
  profile_completion_percentage: number;
  total_sessions_completed: number;
  profile_views: number;
  city_id?: number;
  banner_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  intro_video_url?: string;
  website_url?: string;
  offers_free_discovery: boolean;
  // From cs_coaches (operational)
  subscription_status?: string;
  onboarding_completed: boolean;
  stripe_account_id?: string;
  stripe_charges_enabled?: boolean;
  verified_at?: string;
  last_booking_at?: string;
  // Legacy field aliases (kept for backward compat during transition)
  user_id?: string;         // same as id in new schema
}

/**
 * Post as returned by cs_posts + joined cs_users (new schema).
 * Author data is joined from cs_users; no more denormalized author_* columns.
 */
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  video_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  /** Joined from cs_users — present when using select('*, cs_users!user_id(...)') */
  cs_users?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'slug'> & {
    profile_data?: CoachProfileData | Record<string, unknown>;
  };
  /** Runtime-only flags populated by the feed loader */
  _userLiked?: boolean;
  _userHighlighted?: boolean;
  _userReposted?: boolean;
}

interface Credential {
  id: string;
  coach_id: string;
  title: string;
  issuer: string;
  year?: number;
  is_verified: boolean;
}

interface PortfolioItem {
  id: string;
  coach_id: string;
  title: string;
  description: string;
  image_url?: string;
  link?: string;
  type: 'case_study' | 'testimonial' | 'project';
}

interface CoachStats {
  total_sessions: number;
  total_revenue: number;
  average_rating: number;
  completion_rate: number;
  response_time_hours: number;
}

// ============================================================================
// Booking Types
// ============================================================================

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

interface Booking {
  id: string;
  coach_id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: SessionType;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount: number;
  currency: string;
  platform_fee: number;
  coach_payout: number;
  stripe_payment_intent_id?: string;
  notes?: string;
  location?: string;
  meeting_url?: string;
  created_at: string;
  updated_at: string;
  coach?: Coach;
  client?: User;
}

interface Availability {
  id: string;
  coach_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:mm format
  end_time: string;
  is_available: boolean;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

// ============================================================================
// Review Types
// ============================================================================

interface Review {
  id: string;
  booking_id: string;
  coach_id: string;
  client_id: string;
  rating: number; // 1-5
  comment?: string;
  is_public: boolean;
  created_at: string;
  client?: User;
}

// ============================================================================
// Promo & Referral Types
// ============================================================================

type DiscountType = 'percentage' | 'fixed' | 'free_trial';
type PromoTargetType = 'all' | 'client' | 'coach';

interface PromoCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  target_type: PromoTargetType;
  min_purchase?: number;
  max_uses?: number;
  current_uses: number;
  free_days?: number;
  is_active: boolean;
  expires_at?: string;
  description?: string;
  created_at: string;
}

interface PromoValidationResult {
  valid: boolean;
  status: 'idle' | 'validating' | 'valid' | 'invalid' | 'expired';
  details?: PromoCode;
  error?: string;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'rewarded';
  reward_amount: number;
  created_at: string;
}

// ============================================================================
// Session Notes Types
// ============================================================================

interface SessionNote {
  id: string;
  booking_id: string;
  coach_id: string;
  client_id: string;
  overview?: string;
  topics_covered: string[];
  key_insights: string[];
  action_items: ActionItem[];
  is_draft: boolean;
  is_visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  due_date?: string;
}

// ============================================================================
// Search & Discovery Types
// ============================================================================

interface SearchFilters {
  query?: string;
  specialties?: string[];
  location?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  languages?: string[];
  sessionTypes?: SessionType[];
  hasVideo?: boolean;
  isVerified?: boolean;
}

interface SearchResult {
  coaches: Coach[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface DiscoveryFilters extends SearchFilters {
  sortBy?: 'rating' | 'price' | 'reviews' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Quiz & Matching Types
// ============================================================================

interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'scale' | 'text';
  options?: string[];
  required: boolean;
}

interface QuizAnswer {
  questionId: string;
  answer: string | string[] | number;
}

interface MatchResult {
  coach: Coach;
  score: number;
  reasons: string[];
}

// ============================================================================
// Analytics Types
// ============================================================================

interface AnalyticsEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  newClients: number;
  returningClients: number;
}

// ============================================================================
// API Types
// ============================================================================

interface ApiResponse<T> {
  data: T;
  error: null;
}

interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
    status?: number;
  };
}

type ApiResult<T> = ApiResponse<T> | ApiError;

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Component Props Types
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  className?: string;
}

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  dismissible?: boolean;
}

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

// ============================================================================
// Form Types
// ============================================================================

interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// ============================================================================
// Supabase Types (simplified)
// ============================================================================

interface SupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null }; error: Error | null }>;
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ data: { user: User; session: Session } | null; error: Error | null }>;
    signUp: (credentials: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => Promise<{ data: { user: User; session: Session } | null; error: Error | null }>;
    signInWithOAuth: (options: { provider: string; options?: { redirectTo?: string } }) => Promise<{ data: unknown; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<{ error: Error | null }>;
    updateUser: (updates: Record<string, unknown>) => Promise<{ data: { user: User }; error: Error | null }>;
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  };
  from: (table: string) => SupabaseQueryBuilder;
  storage: {
    from: (bucket: string) => SupabaseStorageBuilder;
  };
}

interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseQueryBuilder;
  insert: (data: unknown) => SupabaseQueryBuilder;
  update: (data: unknown) => SupabaseQueryBuilder;
  delete: () => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder;
  gt: (column: string, value: unknown) => SupabaseQueryBuilder;
  gte: (column: string, value: unknown) => SupabaseQueryBuilder;
  lt: (column: string, value: unknown) => SupabaseQueryBuilder;
  lte: (column: string, value: unknown) => SupabaseQueryBuilder;
  like: (column: string, pattern: string) => SupabaseQueryBuilder;
  ilike: (column: string, pattern: string) => SupabaseQueryBuilder;
  in: (column: string, values: unknown[]) => SupabaseQueryBuilder;
  or: (filters: string) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  range: (from: number, to: number) => SupabaseQueryBuilder;
  single: () => Promise<{ data: unknown; error: Error | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  then: <T>(resolve: (value: { data: T; error: Error | null }) => void) => Promise<void>;
}

interface SupabaseStorageBuilder {
  upload: (path: string, file: File) => Promise<{ data: { path: string }; error: Error | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  remove: (paths: string[]) => Promise<{ error: Error | null }>;
}

export {};

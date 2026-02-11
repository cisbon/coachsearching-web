/**
 * QueryClient Setup
 * Creates and exports the TanStack Query client instance.
 * Also re-exports QueryClientProvider and hooks for convenient access.
 */
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
    useMutation,
    useQueryClient,
} from 'https://esm.sh/@tanstack/react-query@5?external=react';

import { DEFAULT_QUERY_OPTIONS } from './queryConfig.js';

// Create a single QueryClient instance for the entire app
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            ...DEFAULT_QUERY_OPTIONS,
            staleTime: 5 * 60 * 1000, // 5 min default, overridden per-query
            gcTime: 30 * 60 * 1000,   // Keep unused data in cache for 30 min
        },
    },
});

// Re-export for convenience
export { QueryClientProvider, useQuery, useMutation, useQueryClient };

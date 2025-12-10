import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Base URL for GitHub Pages deployment
    base: './',

    // Build configuration
    build: {
        // Output to dist folder
        outDir: 'dist',

        // Generate source maps for debugging
        sourcemap: true,

        // Rollup options
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
            },
            output: {
                // Asset file naming
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
            },
        },

        // Use esbuild for minification (faster, built-in)
        minify: 'esbuild',

        // Copy public files
        copyPublicDir: true,

        // Chunk size warning limit (500 KB)
        chunkSizeWarningLimit: 500,
    },

    // Public directory (files copied as-is to dist root)
    publicDir: 'public',

    // Development server
    server: {
        port: 3000,
        open: true,
        cors: true,
    },

    // Preview server (for testing builds)
    preview: {
        port: 4173,
        open: true,
    },

    // Resolve aliases
    resolve: {
        alias: {
            '@': resolve(__dirname, 'js'),
            '@components': resolve(__dirname, 'js/components'),
            '@utils': resolve(__dirname, 'js/utils'),
            '@pages': resolve(__dirname, 'js/pages'),
        },
    },

    // Define global constants
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
    },
});

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom', // Using happy-dom for speed
    setupFiles: [], // Can add setup files here if needed later
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx', // Example: exclude main application entry
        'src/vite-env.d.ts',
        'src/types', // Usually, type definitions don't need coverage
        'src/data/mockNews.ts', // Exclude mock data
      ],
    },
  },
});

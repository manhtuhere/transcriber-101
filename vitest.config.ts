import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          // .ts tests are pure logic and run in node; .tsx tests render and
          // run in jsdom. The extension is the whole rule.
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.tsx'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'scripts/lib/**'],
      exclude: ['src/lib/database.types.ts', 'src/lib/models.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})

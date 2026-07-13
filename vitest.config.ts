import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['App.tsx', 'components/**/*.tsx', 'services/**/*.ts', 'types.ts'],
      thresholds: {
        branches: 30,
        functions: 25,
        lines: 30,
        statements: 30,
        'types.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'services/analysisHistory.ts': {
          branches: 85,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'services/geminiService.ts': {
          branches: 65,
          functions: 85,
          lines: 80,
          statements: 80,
        },
        'services/timecode.ts': {
          branches: 85,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'services/transientDetection.ts': {
          branches: 80,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'services/videoAnalysisQuality.ts': {
          branches: 90,
          functions: 100,
          lines: 98,
          statements: 98,
        },
        'services/videoCompression.ts': {
          branches: 75,
          functions: 85,
          lines: 95,
          statements: 90,
        },
      },
    },
  },
});

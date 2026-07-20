import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Sans `globals: true`, le nettoyage automatique de testing-library ne s'active
// pas : on démonte explicitement le DOM et les mocks entre chaque test.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

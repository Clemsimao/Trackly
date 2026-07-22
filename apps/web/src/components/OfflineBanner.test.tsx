import { render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fr } from '../i18n/fr';
import { OfflineBanner } from './OfflineBanner';

function simulerReseau(enLigne: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: enLigne, configurable: true });
}

afterEach(() => {
  simulerReseau(true);
  vi.useRealTimers();
});

describe('OfflineBanner (CA G1)', () => {
  it('reste invisible tant que la connexion est là', () => {
    simulerReseau(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('apparaît si l’app démarre déjà hors connexion', () => {
    simulerReseau(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(fr.network.offline);
  });

  it('réagit à la perte puis au retour de connexion', () => {
    vi.useFakeTimers();
    simulerReseau(true);
    render(<OfflineBanner />);

    act(() => {
      simulerReseau(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(fr.network.offline);

    act(() => {
      simulerReseau(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(fr.network.backOnline);

    // le message de retour s'efface tout seul, celui de perte non
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});

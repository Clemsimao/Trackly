import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Poster } from './Poster';

describe('Poster', () => {
  it("affiche le titre quand aucune image n'est disponible", () => {
    render(<Poster url={null} title="Loki" />);

    expect(screen.getByText('Loki')).toBeVisible();
  });

  it("remplace une image qui ne charge pas par le titre de l'œuvre", () => {
    const { container } = render(<Poster url="https://example.com/loki.jpg" title="Loki" />);
    const image = container.querySelector('img');

    expect(image).toHaveAttribute('src', 'https://example.com/loki.jpg');
    fireEvent.error(image!);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Loki')).toBeVisible();
  });

  it("essaie la nouvelle URL après l'échec de la précédente", () => {
    const { container, rerender } = render(
      <Poster url="https://example.com/ancienne.jpg" title="Loki" />,
    );
    fireEvent.error(container.querySelector('img')!);

    rerender(<Poster url="https://example.com/nouvelle.jpg" title="Loki" />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/nouvelle.jpg',
    );
  });
});

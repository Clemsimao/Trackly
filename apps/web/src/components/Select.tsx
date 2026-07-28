import type { ChangeEvent, ReactNode } from 'react';

/**
 * Select habillé de bout en bout. Le contrôle natif nu ignorait les surfaces du
 * thème et cassait la ligne visuelle des pills juste au-dessus ; on reprend
 * donc l'apparence du bouton fermé (la liste déroulante, elle, reste rendue par
 * le système — c'est le prix de l'accessibilité native, et il vaut le coup).
 */
export function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className="appearance-none rounded-lg border border-(--border) bg-(--surface) py-1.5 pr-8 pl-3 text-sm transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 h-1.5 w-1.5 -translate-y-2/3 rotate-45 border-r-[1.5px] border-b-[1.5px] border-(--text-muted)"
      />
    </span>
  );
}

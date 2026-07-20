import { fr } from '../i18n/fr';

/** Indicateur simple (story A1) : longueur + variété de caractères. */
export function passwordScore(password: string): number {
  if (password.length === 0) return -1;
  if (password.length < 12) return 0;
  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/\d/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;
  if (password.length >= 20) variety++;
  return Math.min(4, Math.max(1, variety));
}

const COLORS = ['bg-dropped', 'bg-dropped', 'bg-paused', 'bg-progress', 'bg-done'];

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  if (score < 0) return null;

  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? COLORS[score] : 'bg-(--border)'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-(--text-muted)">
        {fr.passwordStrength.label} : {fr.passwordStrength.levels[score]}
      </p>
    </div>
  );
}

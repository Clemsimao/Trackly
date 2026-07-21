/** Formats d'affichage des durées (budget temps). */

export function formatHoursFromSeconds(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 10) return `${Math.round(hours)} h`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole} h`;
  if (whole === 0) return `${minutes} min`;
  return `${whole} h ${String(minutes).padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

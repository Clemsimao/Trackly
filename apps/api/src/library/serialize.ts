/** Conversions champ date-only (colonnes @db.Date) ↔ chaînes AAAA-MM-JJ du contrat. */

export function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** undefined = champ absent du PATCH (inchangé), null = effacé. */
export function fromDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

export function todayDateOnly(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

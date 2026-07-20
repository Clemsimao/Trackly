const STORAGE_KEY = 'trackly-theme';

export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function toggleTheme(): boolean {
  const dark = !isDark();
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  return dark;
}

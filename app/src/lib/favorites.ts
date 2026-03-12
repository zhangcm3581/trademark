const FAVORITES_KEY = 'trademark_favorites';
const INTL_FAVORITES_KEY = 'trademark_intl_favorites';

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(FAVORITES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getIntlFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(INTL_FAVORITES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function toggleFavorite(id: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return false;
  } else {
    favs.push(id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return true;
  }
}

export function toggleIntlFavorite(id: string): boolean {
  const favs = getIntlFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    localStorage.setItem(INTL_FAVORITES_KEY, JSON.stringify(favs));
    return false;
  } else {
    favs.push(id);
    localStorage.setItem(INTL_FAVORITES_KEY, JSON.stringify(favs));
    return true;
  }
}

export function isFavorited(id: string): boolean {
  return getFavorites().includes(id);
}

export function isIntlFavorited(id: string): boolean {
  return getIntlFavorites().includes(id);
}

export function removeFavorites(ids: string[]) {
  const favs = getFavorites().filter(id => !ids.includes(id));
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export function removeIntlFavorites(ids: string[]) {
  const favs = getIntlFavorites().filter(id => !ids.includes(id));
  localStorage.setItem(INTL_FAVORITES_KEY, JSON.stringify(favs));
}

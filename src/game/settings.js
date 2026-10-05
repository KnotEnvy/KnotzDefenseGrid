// Persistent player settings. `?fx=low|high` in the URL overrides the saved effects quality (handy for tests).
const KEY = 'beamfall.quality';

export function getQuality() {
  const q = new URLSearchParams(location.search).get('fx');
  if (q === 'low' || q === 'high') return q;
  try {
    return localStorage.getItem(KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

export function setQuality(v) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
}

export const isLow = () => getQuality() === 'low';

import { Platform } from 'react-native';

const YT_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function extractYouTubeId(input) {
  if (typeof input !== 'string') return null;
  const m = input.trim().match(YT_ID_RE);
  return m ? m[1] : null;
}

export function cleanYouTubeTitle(rawTitle) {
  if (typeof rawTitle !== 'string') return '';
  return rawTitle
    // Quita bloques típicos entre paréntesis o corchetes: (Official Video), [Lyrics], (En Vivo), (4K), etc.
    .replace(
      /\s*[\[(][^)\]]*(?:official|oficial|video|lyric|letra|audio|live|vivo|remaster|hd|4k|ac[uú]stico|acoustic|clip|versi[oó]n|topic|subtitul|karaoke)[^)\]]*[\])]/gi,
      ''
    )
    // Quita sufijos después de " | "
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function fetchYouTubeTitle(rawUrl) {
  const id = extractYouTubeId(rawUrl);
  if (!id) return { ok: false, reason: 'invalid_url' };

  const canonical = `https://www.youtube.com/watch?v=${id}`;
  const endpoints = [`https://noembed.com/embed?url=${encodeURIComponent(canonical)}`];
  if (Platform.OS !== 'web') {
    endpoints.push(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`
    );
  }

  for (const endpoint of endpoints) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 7000) : null;
      const res = await fetch(endpoint, controller ? { signal: controller.signal } : undefined);
      if (timer) clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data.title === 'string' && data.title.trim()) {
        return {
          ok: true,
          id,
          rawTitle: data.title.trim(),
          title: cleanYouTubeTitle(data.title),
          author: typeof data.author_name === 'string' ? data.author_name.trim() : '',
        };
      }
    } catch {
      // Intenta el siguiente endpoint o devuelve error offline
    }
  }

  return { ok: false, id, reason: 'fetch_failed' };
}

export function buildChordSearchUrls(query) {
  const q = query.trim();
  const encoded = encodeURIComponent(q);
  return {
    lacuerda: `https://acordes.lacuerda.net/busca.php?exp=${encoded}`,
    cifraclub: `https://www.cifraclub.com/?q=${encoded}`,
    google: `https://www.google.com/search?q=${encodeURIComponent(`${q} acordes`)}`,
  };
}

import { Song, Playlist } from '../types/music';

// Scoped key generators for Multi-Tenant & Multi-User isolation
export function getPlaylistsStorageKey(tenantId?: string, userId?: string): string {
  const t = (tenantId || 'global').trim();
  const u = (userId || 'guest').trim();
  return `roma_music_playlists_${t}_${u}`;
}

export function getFavoritesStorageKey(tenantId?: string, userId?: string): string {
  const t = (tenantId || 'global').trim();
  const u = (userId || 'guest').trim();
  return `roma_music_favorites_${t}_${u}`;
}

export function getLastPlayedStorageKey(tenantId?: string, userId?: string): string {
  const t = (tenantId || 'global').trim();
  const u = (userId || 'guest').trim();
  return `roma_music_last_played_${t}_${u}`;
}

export function getSettingsStorageKey(tenantId?: string, userId?: string): string {
  const t = (tenantId || 'global').trim();
  const u = (userId || 'guest').trim();
  return `roma_music_settings_${t}_${u}`;
}

export async function searchMusic(query: string): Promise<Song[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results;
      }
    }
  } catch (err) {
    console.error('Error fetching search results from /api/music/search:', err);
  }

  // Client-side fallback if server fails
  try {
    const isYtUrl = clean.includes('youtube.com') || clean.includes('youtu.be');
    if (isYtUrl) {
      const directMatch = clean.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/);
      const videoId = directMatch ? directMatch[1] : null;
      if (videoId) {
        const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`);
        if (noembedRes.ok) {
          const info = await noembedRes.json();
          return [
            {
              id: videoId,
              videoId,
              title: info.title || 'Video de YouTube',
              artist: info.author_name || 'YouTube',
              thumbnailUrl: info.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: 0,
              addedAt: Date.now(),
            },
          ];
        }
      }
    }
  } catch {}

  return [];
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const res = await fetch(`/api/music/suggestions?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.suggestions) ? data.suggestions : [];
    }
  } catch {}
  return [];
}

export function getDefaultPlaylist(): Playlist {
  return {
    id: 'default-lofi',
    name: 'Focus & Trabajo 🎧',
    description: 'Música relajante para concentrarse mientras trabajas en el sistema',
    accentColor: '#3b82f6',
    createdAt: Date.now(),
    songs: [
      {
        id: 'jfKfPfyJRdk',
        videoId: 'jfKfPfyJRdk',
        title: 'lofi hip hop radio 📚 - beats to relax/study to',
        artist: 'Lofi Girl',
        thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        duration: 0,
        addedAt: Date.now(),
      },
      {
        id: '5qap5aO4i9A',
        videoId: '5qap5aO4i9A',
        title: 'Lofi Hip Hop Radio - Beats to Sleep/Chill to',
        artist: 'Lofi Girl',
        thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
        duration: 0,
        addedAt: Date.now(),
      },
    ],
  };
}

// Local Storage helpers with Tenant + User isolation
export function getSavedPlaylists(tenantId?: string, userId?: string): Playlist[] {
  const key = getPlaylistsStorageKey(tenantId, userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Migration fallback: check legacy global key if tenant/user specific key doesn't exist yet
    const legacyRaw = localStorage.getItem('roma_music_playlists');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(key, legacyRaw);
        return parsed;
      }
    }
  } catch {}

  return [getDefaultPlaylist()];
}

export function savePlaylists(playlists: Playlist[], tenantId?: string, userId?: string): void {
  try {
    const key = getPlaylistsStorageKey(tenantId, userId);
    localStorage.setItem(key, JSON.stringify(playlists));
  } catch {}
}

export function getSavedFavorites(tenantId?: string, userId?: string): Song[] {
  const key = getFavoritesStorageKey(tenantId, userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Migration fallback
    const legacyRaw = localStorage.getItem('roma_music_favorites');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(key, legacyRaw);
        return parsed;
      }
    }
  } catch {}
  return [];
}

export function saveFavorites(favorites: Song[], tenantId?: string, userId?: string): void {
  try {
    const key = getFavoritesStorageKey(tenantId, userId);
    localStorage.setItem(key, JSON.stringify(favorites));
  } catch {}
}

export function getSavedLastPlayed(tenantId?: string, userId?: string): Song | null {
  const key = getLastPlayedStorageKey(tenantId, userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    const legacyRaw = localStorage.getItem('roma_music_last_played');
    if (legacyRaw) return JSON.parse(legacyRaw);
  } catch {}
  return null;
}

export function saveLastPlayed(song: Song | null, tenantId?: string, userId?: string): void {
  try {
    const key = getLastPlayedStorageKey(tenantId, userId);
    if (song) {
      localStorage.setItem(key, JSON.stringify(song));
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
}

export function getPlayerSettings(tenantId?: string, userId?: string): { volume: number; repeatMode: 'off' | 'all' | 'one'; isShuffle: boolean } {
  const key = getSettingsStorageKey(tenantId, userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    const legacyRaw = localStorage.getItem('roma_music_settings');
    if (legacyRaw) return JSON.parse(legacyRaw);
  } catch {}
  return { volume: 80, repeatMode: 'off', isShuffle: false };
}

export function savePlayerSettings(
  settings: { volume: number; repeatMode: 'off' | 'all' | 'one'; isShuffle: boolean },
  tenantId?: string,
  userId?: string
): void {
  try {
    const key = getSettingsStorageKey(tenantId, userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {}
}

// Server API Synchronization per User & Tenant
export async function fetchUserMusicLibrary(
  token: string | null
): Promise<{ playlists?: Playlist[]; favorites?: Song[] } | null> {
  if (!token) return null;
  try {
    const res = await fetch('/api/music/library', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
        favorites: Array.isArray(data.favorites) ? data.favorites : [],
      };
    }
  } catch (err) {
    console.warn('Could not sync music library with server:', err);
  }
  return null;
}

export async function saveUserMusicLibrary(
  token: string | null,
  data: { playlists?: Playlist[]; favorites?: Song[] }
): Promise<void> {
  if (!token) return;
  try {
    await fetch('/api/music/library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('Could not save music library to server:', err);
  }
}

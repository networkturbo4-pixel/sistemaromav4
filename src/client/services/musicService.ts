import { Song, Playlist } from '../types/music';

const STORAGE_PLAYLISTS_KEY = 'roma_music_playlists';
const STORAGE_FAVORITES_KEY = 'roma_music_favorites';
const STORAGE_LAST_PLAYED_KEY = 'roma_music_last_played';
const STORAGE_PLAYER_SETTINGS_KEY = 'roma_music_settings';

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

// Local Storage helpers for playlists & favorites
export function getSavedPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
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
    },
  ];
}

export function savePlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {}
}

export function getSavedFavorites(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveFavorites(favorites: Song[]): void {
  try {
    localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}

export function getSavedLastPlayed(): Song | null {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_PLAYED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveLastPlayed(song: Song | null): void {
  try {
    if (song) {
      localStorage.setItem(STORAGE_LAST_PLAYED_KEY, JSON.stringify(song));
    }
  } catch {}
}

export function getPlayerSettings(): { volume: number; repeatMode: 'off' | 'all' | 'one'; isShuffle: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYER_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { volume: 80, repeatMode: 'off', isShuffle: false };
}

export function savePlayerSettings(settings: { volume: number; repeatMode: 'off' | 'all' | 'one'; isShuffle: boolean }): void {
  try {
    localStorage.setItem(STORAGE_PLAYER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

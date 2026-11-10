import { Song } from '../types/music';

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeekTo?: (position: number) => void;
}

export function updateMediaSessionMetadata(
  song: Song | null,
  playlistName?: string,
  _isPlaying = false
): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  if (!song) {
    navigator.mediaSession.metadata = null;
    return;
  }

  try {
    const artwork = [
      {
        src: song.thumbnailUrl || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
        sizes: '512x512',
        type: 'image/jpeg',
      },
      {
        src: song.thumbnailUrl || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
        sizes: '128x128',
        type: 'image/jpeg',
      },
    ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Soundify Player',
      artist: song.artist || 'Sistema Roma',
      album: playlistName || 'Sistema Roma Music',
      artwork,
    });
  } catch (err) {
    console.warn('Error configurando MediaSession metadata', err);
  }
}

export function updateMediaSessionPlaybackState(
  isPlaying: boolean,
  position = 0,
  duration = 0,
  playbackRate = 1.0
): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    if (
      'setPositionState' in navigator.mediaSession &&
      typeof navigator.mediaSession.setPositionState === 'function' &&
      duration > 0 &&
      position >= 0 &&
      position <= duration
    ) {
      navigator.mediaSession.setPositionState({
        duration: Math.round(duration),
        playbackRate,
        position: Math.min(Math.round(position), Math.round(duration)),
      });
    }
  } catch (err) {
    // Some browsers might throw if position is out of bounds
  }
}

export function setupMediaSessionActionHandlers(callbacks: MediaSessionCallbacks): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  const actionHandlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
    ['play', () => callbacks.onPlay()],
    ['pause', () => callbacks.onPause()],
    ['nexttrack', () => callbacks.onNext()],
    ['previoustrack', () => callbacks.onPrevious()],
    [
      'seekto',
      (details) => {
        if (details.seekTime !== undefined && callbacks.onSeekTo) {
          callbacks.onSeekTo(details.seekTime);
        }
      },
    ],
  ];

  for (const [action, handler] of actionHandlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Ignore unsupported media actions in older browsers
    }
  }
}

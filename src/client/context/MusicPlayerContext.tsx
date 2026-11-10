import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Song, Playlist } from '../types/music';
import {
  getSavedPlaylists,
  savePlaylists,
  getSavedFavorites,
  saveFavorites,
  getSavedLastPlayed,
  saveLastPlayed,
  getPlayerSettings,
  savePlayerSettings,
} from '../services/musicService';
import {
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  setupMediaSessionActionHandlers,
} from '../services/mediaSessionService';

interface MusicPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  queue: Song[];
  queueIndex: number;
  playlists: Playlist[];
  favorites: Song[];
  isWidgetVisible: boolean;
  isWidgetExpanded: boolean;
  isMusicSubmoduleOpen: boolean;
  seekRequested: number | null;

  // Actions
  setIsMusicSubmoduleOpen: (open: boolean) => void;
  playSong: (song: Song, playlist?: Playlist) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (seconds: number) => void;
  onSeekHandled: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: string) => boolean;
  setWidgetVisible: (visible: boolean) => void;
  setWidgetExpanded: (expanded: boolean) => void;

  // Engine callbacks
  onEngineTimeUpdate: (currentTime: number, duration: number) => void;
  onEngineSongEnded: () => void;
  onEnginePlayerStateChange: (isPlaying: boolean) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getSavedPlaylists());
  const [favorites, setFavorites] = useState<Song[]>(() => getSavedFavorites());
  const [currentSong, setCurrentSong] = useState<Song | null>(() => getSavedLastPlayed());
  const [queue, setQueue] = useState<Song[]>(() => {
    const last = getSavedLastPlayed();
    return last ? [last] : [];
  });
  const [queueIndex, setQueueIndex] = useState<number>(0);

  const initialSettings = getPlayerSettings();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(initialSettings.volume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(initialSettings.repeatMode);
  const [isShuffle, setIsShuffle] = useState<boolean>(initialSettings.isShuffle);
  const [seekRequested, setSeekRequested] = useState<number | null>(null);

  const [isWidgetVisible, setWidgetVisible] = useState<boolean>(true);
  const [isWidgetExpanded, setWidgetExpanded] = useState<boolean>(false);
  const [isMusicSubmoduleOpen, setIsMusicSubmoduleOpen] = useState<boolean>(false);

  // Sync playlists
  useEffect(() => {
    savePlaylists(playlists);
  }, [playlists]);

  // Sync favorites
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Sync settings
  useEffect(() => {
    savePlayerSettings({ volume, repeatMode, isShuffle });
  }, [volume, repeatMode, isShuffle]);

  // Sync current song to last played
  useEffect(() => {
    saveLastPlayed(currentSong);
    updateMediaSessionMetadata(currentSong, 'Sistema Roma Music', isPlaying);
  }, [currentSong]);

  // Update MediaSession state
  useEffect(() => {
    updateMediaSessionPlaybackState(isPlaying, currentTime, duration);
  }, [isPlaying, currentTime, duration]);

  const togglePlayPause = useCallback(() => {
    if (!currentSong && queue.length > 0) {
      setCurrentSong(queue[0]);
      setQueueIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [currentSong, queue]);

  const playSong = useCallback((song: Song, playlist?: Playlist) => {
    if (playlist && playlist.songs.length > 0) {
      setQueue(playlist.songs);
      const foundIdx = playlist.songs.findIndex((s) => s.id === song.id || s.videoId === song.videoId);
      setQueueIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setQueue((prev) => {
        const exists = prev.some((s) => s.videoId === song.videoId);
        if (!exists) return [...prev, song];
        return prev;
      });
      setQueueIndex((prev) => {
        const found = queue.findIndex((s) => s.videoId === song.videoId);
        return found >= 0 ? found : prev;
      });
    }
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
  }, [queue]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentSong) {
      setSeekRequested(0);
      setIsPlaying(true);
      return;
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      setQueueIndex(randomIndex);
      setCurrentSong(queue[randomIndex]);
      setIsPlaying(true);
      return;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      setCurrentSong(queue[nextIndex]);
      setIsPlaying(true);
    } else if (repeatMode === 'all') {
      setQueueIndex(0);
      setCurrentSong(queue[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, repeatMode, isShuffle, currentSong]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 4) {
      setSeekRequested(0);
      return;
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      setCurrentSong(queue[prevIndex]);
      setIsPlaying(true);
    } else {
      setSeekRequested(0);
    }
  }, [queue, queueIndex, currentTime]);

  const seekTo = useCallback((seconds: number) => {
    setSeekRequested(seconds);
    setCurrentTime(seconds);
  }, []);

  const onSeekHandled = useCallback(() => {
    setSeekRequested(null);
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
    if (!currentSong) {
      setCurrentSong(song);
      setQueueIndex(0);
      setIsPlaying(true);
    }
  }, [currentSong]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index === queueIndex) {
      playNext();
    } else if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1);
    }
  }, [queueIndex, playNext]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(0);
    setCurrentSong(null);
    setIsPlaying(false);
  }, []);

  const createPlaylist = useCallback((name: string, description?: string): Playlist => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || 'Mi Playlist',
      description: description?.trim() || '',
      accentColor: '#3b82f6',
      createdAt: Date.now(),
      songs: [],
    };
    setPlaylists((prev) => [...prev, newPl]);
    return newPl;
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, song: Song) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.songs.some((s) => s.videoId === song.videoId)) return p;
        return { ...p, songs: [...p.songs, song] };
      })
    );
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, songs: p.songs.filter((s) => s.id !== songId && s.videoId !== songId) };
      })
    );
  }, []);

  const toggleFavorite = useCallback((song: Song) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.videoId === song.videoId);
      if (exists) {
        return prev.filter((s) => s.videoId !== song.videoId);
      } else {
        return [song, ...prev];
      }
    });
  }, []);

  const isFavorite = useCallback(
    (songId: string) => {
      return favorites.some((s) => s.id === songId || s.videoId === songId);
    },
    [favorites]
  );

  // Engine callbacks
  const onEngineTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0) setDuration(dur);
  }, []);

  const onEngineSongEnded = useCallback(() => {
    playNext();
  }, [playNext]);

  const onEnginePlayerStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Setup media session action handlers
  useEffect(() => {
    setupMediaSessionActionHandlers({
      onPlay: () => setIsPlaying(true),
      onPause: () => setIsPlaying(false),
      onNext: playNext,
      onPrevious: playPrevious,
      onSeekTo: seekTo,
    });
  }, [playNext, playPrevious, seekTo]);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffle,
        queue,
        queueIndex,
        playlists,
        favorites,
        isWidgetVisible,
        isWidgetExpanded,
        isMusicSubmoduleOpen,
        setIsMusicSubmoduleOpen,
        seekRequested,
        playSong,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
        onSeekHandled,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
        addToQueue,
        removeFromQueue,
        clearQueue,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        toggleFavorite,
        isFavorite,
        setWidgetVisible,
        setWidgetExpanded,
        onEngineTimeUpdate,
        onEngineSongEnded,
        onEnginePlayerStateChange,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};

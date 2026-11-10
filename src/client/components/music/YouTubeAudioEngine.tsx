import React, { useEffect, useRef } from 'react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubeAudioEngine: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    seekRequested,
    onSeekHandled,
    onEngineTimeUpdate,
    onEngineSongEnded,
    onEnginePlayerStateChange,
  } = useMusicPlayer();

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);
  const isApiLoadedRef = useRef<boolean>(false);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Silent audio generator to keep mobile browsers running in background
  useEffect(() => {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
      );
      audio.loop = true;
      silentAudioRef.current = audio;
    } catch {}

    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    };
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      isApiLoadedRef.current = true;
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      isApiLoadedRef.current = true;
      initPlayer();
    };
  }, []);

  const initPlayer = () => {
    if (playerRef.current || !containerRef.current || !window.YT) return;

    try {
      playerRef.current = new window.YT.Player('roma-yt-audio-player-iframe', {
        height: '180',
        width: '320',
        host: 'https://www.youtube.com',
        videoId: currentSong?.videoId || '',
        playerVars: {
          enablejsapi: 1,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            const vol = isMuted ? 0 : volume;
            event.target.setVolume(vol);
            if (currentSong && isPlaying) {
              event.target.loadVideoById(currentSong.videoId);
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            // YT.PlayerState.ENDED === 0
            if (state === 0) {
              onEngineSongEnded();
            }
            // YT.PlayerState.PLAYING === 1
            else if (state === 1) {
              onEnginePlayerStateChange(true);
              if (silentAudioRef.current) {
                silentAudioRef.current.play().catch(() => {});
              }
            }
            // YT.PlayerState.PAUSED === 2
            else if (state === 2) {
              // Si el estado de la app indica que debe reproducirse (por ejemplo carga inicial o buffer),
              // forzar reproducción y NO pausar el estado en React
              if (isPlayingRef.current) {
                try {
                  playerRef.current?.playVideo?.();
                } catch {}
              } else {
                onEnginePlayerStateChange(false);
                if (silentAudioRef.current) {
                  silentAudioRef.current.pause();
                }
              }
            }
          },
          onError: (event: any) => {
            console.warn('YouTube Audio Engine error:', event?.data);
            // Si el video está bloqueado para incrustación (101 / 150), saltar a la siguiente
            if (event?.data === 150 || event?.data === 101 || event?.data === 100) {
              setTimeout(() => {
                onEngineSongEnded();
              }, 800);
            }
          },
        },
      });
    } catch (err) {
      console.warn('Error initializing YouTube Player:', err);
    }
  };

  // Sync song changes
  const prevVideoIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!playerRef.current || !currentSong?.videoId) return;

    if (prevVideoIdRef.current !== currentSong.videoId) {
      prevVideoIdRef.current = currentSong.videoId;
      try {
        if (typeof playerRef.current.loadVideoById === 'function') {
          if (isPlaying) {
            playerRef.current.loadVideoById(currentSong.videoId);
            try {
              playerRef.current.playVideo();
            } catch {}
          } else {
            playerRef.current.cueVideoById(currentSong.videoId);
          }
        }
      } catch (err) {
        console.warn('Error loading video in YT Player', err);
      }
    }
  }, [currentSong, isPlaying]);

  // Sync isPlaying state
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
        if (silentAudioRef.current) {
          silentAudioRef.current.play().catch(() => {});
        }
      } else {
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
        if (silentAudioRef.current) {
          silentAudioRef.current.pause();
        }
      }
    } catch {}
  }, [isPlaying]);

  // Sync volume & mute
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.setVolume !== 'function') return;
    try {
      const targetVol = isMuted ? 0 : volume;
      playerRef.current.setVolume(targetVol);
    } catch {}
  }, [volume, isMuted]);

  // Sync seek requests
  useEffect(() => {
    if (seekRequested === null || !playerRef.current) return;
    try {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(seekRequested, true);
      }
    } catch {}
    onSeekHandled();
  }, [seekRequested, onSeekHandled]);

  // Time update polling
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (!playerRef.current) return;
      try {
        if (typeof playerRef.current.getCurrentTime === 'function') {
          const time = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          onEngineTimeUpdate(time, dur);
        }
      } catch {}
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onEngineTimeUpdate]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: '-300px',
        right: '-300px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -9999,
      }}
      aria-hidden="true"
    >
      <div id="roma-yt-audio-player-iframe" />
    </div>
  );
};

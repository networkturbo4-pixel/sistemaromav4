import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react';

export interface SystemVideoPlayerProps {
  src: string;
  poster?: string;
  initialWidth?: number | null;
  initialHeight?: number | null;
  initialDuration?: number | null;
  formatHint?: string;
  autoPlay?: boolean;
  muted?: boolean;
  compact?: boolean;
  maxHeightPx?: number;
  className?: string;
  seekToSeconds?: { time: number; nonce: number } | null;
  onTimestampComment?: (seconds: number, formatted: string) => void;
  onError?: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VOLUME_STORAGE_KEY = 'roma_video_volume';
const MUTED_STORAGE_KEY = 'roma_video_muted';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const SystemVideoPlayer: React.FC<SystemVideoPlayerProps> = ({
  src,
  poster,
  initialWidth,
  initialHeight,
  initialDuration,
  formatHint,
  autoPlay = false,
  muted: mutedProp = false,
  compact = false,
  maxHeightPx = 540,
  className = '',
  seekToSeconds = null,
  onTimestampComment,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasMetadata, setHasMetadata] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<{ time: number; pct: number } | null>(null);

  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed)) return Math.min(1, Math.max(0, parsed));
      }
    } catch {}
    return 0.85;
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (mutedProp) return true;
    try {
      return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [posterFailed, setPosterFailed] = useState(false);

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(() =>
    initialWidth && initialHeight ? { width: initialWidth, height: initialHeight } : null
  );

  // Sincronizar dimensiones iniciales si llegan de /api/drive/meta/:id
  useEffect(() => {
    if (initialWidth && initialHeight && !naturalSize) {
      setNaturalSize({ width: initialWidth, height: initialHeight });
    }
  }, [initialWidth, initialHeight, naturalSize]);

  useEffect(() => {
    if (initialDuration && !duration) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration]);

  // Reiniciar estado cuando cambia el src
  useEffect(() => {
    setIsPlaying(false);
    setIsBuffering(true);
    setHasMetadata(false);
    setCurrentTime(0);
    setBufferedPct(0);
    setPosterFailed(false);
    setShowSpeedMenu(false);
    setControlsVisible(true);
    setDuration(initialDuration || 0);
    setNaturalSize(
      initialWidth && initialHeight ? { width: initialWidth, height: initialHeight } : null
    );
  }, [src]);

  // Aplicar volumen / mute / velocidad al elemento <video>
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = isMuted || mutedProp;
    v.playbackRate = playbackRate;
  }, [volume, isMuted, mutedProp, playbackRate, src]);

  // Saltar a un segundo específico desde un comentario con marca de tiempo
  useEffect(() => {
    if (!seekToSeconds) return;
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, seekToSeconds.time);
    v.currentTime = target;
    setCurrentTime(target);
    v.play().catch(() => {});
    setControlsVisible(true);
  }, [seekToSeconds?.nonce, seekToSeconds?.time]);

  // Auto-ocultar barra de controles durante reproducción
  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setControlsVisible(true);
    if (isPlaying && !isScrubbing && !showSpeedMenu) {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 2400);
    }
  }, [isPlaying, isScrubbing, showSpeedMenu]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      scheduleHideControls();
    }
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, scheduleHideControls]);

  // Escuchar cambios de Fullscreen
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement === containerRef.current));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const skipSeconds = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, Math.min(v.duration || duration || 0, v.currentTime + delta));
    v.currentTime = target;
    setCurrentTime(target);
    scheduleHideControls();
  }, [duration, scheduleHideControls]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTED_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((nextVal: number) => {
    const clamped = Math.min(1, Math.max(0, nextVal));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
      try {
        localStorage.setItem(MUTED_STORAGE_KEY, 'false');
      } catch {}
    } else if (clamped === 0 && !isMuted) {
      setIsMuted(true);
    }
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
    } catch {}
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && !v.disablePictureInPicture) {
        await v.requestPictureInPicture();
      }
    } catch {}
  }, []);

  // Scrubber con seguimiento 1:1 (Pointer Events + setPointerCapture)
  const updateScrubFromClientX = useCallback(
    (clientX: number) => {
      const bar = scrubberRef.current;
      const v = videoRef.current;
      if (!bar || !v) return;
      const rect = bar.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const total = v.duration || duration || 0;
      if (total > 0) {
        const nextTime = ratio * total;
        v.currentTime = nextTime;
        setCurrentTime(nextTime);
      }
    },
    [duration]
  );

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    updateScrubFromClientX(e.clientX);
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const bar = scrubberRef.current;
    if (bar) {
      const rect = bar.getBoundingClientRect();
      if (rect.width > 0) {
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const total = videoRef.current?.duration || duration || 0;
        setHoverTime({ time: ratio * total, pct: ratio * 100 });
      }
    }
    if (isScrubbing) {
      updateScrubFromClientX(e.clientX);
    }
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsScrubbing(false);
    }
  };

  // Atajos de teclado cuando el reproductor tiene foco
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopPropagation();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      skipSeconds(-5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      skipSeconds(5);
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      e.stopPropagation();
      toggleMute();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
    }
  };

  const updateBuffered = () => {
    const v = videoRef.current;
    if (!v || !v.duration || v.buffered.length === 0) return;
    try {
      const end = v.buffered.end(v.buffered.length - 1);
      setBufferedPct(Math.min(100, (end / v.duration) * 100));
    } catch {}
  };

  // Calcular proporción y orientación para evitar saltos de layout o barras negras deformes
  const isVerticalHint =
    formatHint === 'reel' || formatHint === 'story' || formatHint === 'short';
  const aspectW = naturalSize?.width || (isVerticalHint ? 9 : 16);
  const aspectH = naturalSize?.height || (isVerticalHint ? 16 : 9);
  const isPortrait = aspectH > aspectW;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Estilo del contenedor que respeta el tamaño y relación de aspecto real del video
  const wrapperStyle: React.CSSProperties = isFullscreen
    ? { width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }
    : hasMetadata
    ? { maxHeight: `${maxHeightPx}px`, maxWidth: '100%' }
    : isPortrait
    ? {
        aspectRatio: `${aspectW} / ${aspectH}`,
        height: `${Math.min(maxHeightPx, 520)}px`,
        maxHeight: `${maxHeightPx}px`,
        maxWidth: '100%',
      }
    : {
        aspectRatio: `${aspectW} / ${aspectH}`,
        width: '100%',
        maxHeight: `${maxHeightPx}px`,
        maxWidth: '100%',
      };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      onMouseMove={scheduleHideControls}
      onMouseLeave={() => {
        if (isPlaying && !isScrubbing && !showSpeedMenu) {
          setControlsVisible(false);
        }
      }}
      style={wrapperStyle}
      className={`group/player relative inline-flex items-center justify-center overflow-hidden select-none bg-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 ${
        isFullscreen ? 'rounded-none' : 'rounded-2xl shadow-lg ring-1 ring-black/10 dark:ring-white/10'
      } ${className}`}
    >
      {/* Elemento <video> respetando su relación de aspecto intrínseca */}
      <video
        ref={videoRef}
        src={src}
        poster={!posterFailed && poster ? poster : undefined}
        autoPlay={autoPlay}
        muted={isMuted || mutedProp}
        playsInline
        preload="metadata"
        onClick={(e) => {
          e.stopPropagation();
          if (!compact) togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!compact) toggleFullscreen();
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            setNaturalSize({ width: v.videoWidth, height: v.videoHeight });
          }
          if (Number.isFinite(v.duration) && v.duration > 0) {
            setDuration(v.duration);
          }
          setHasMetadata(true);
          setIsBuffering(false);
          updateBuffered();
        }}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setControlsVisible(true);
        }}
        onWaiting={() => setIsBuffering(true)}
        onTimeUpdate={(e) => {
          if (!isScrubbing) {
            setCurrentTime(e.currentTarget.currentTime);
          }
        }}
        onProgress={updateBuffered}
        onError={() => {
          setIsBuffering(false);
          onError?.();
        }}
        style={
          isFullscreen
            ? undefined
            : { maxHeight: `${maxHeightPx}px` }
        }
        className={
          isFullscreen
            ? 'w-full h-full object-contain'
            : hasMetadata
            ? 'block w-auto h-auto max-w-full object-contain'
            : 'w-full h-full object-contain'
        }
      />

      {/* Póster de respaldo con fade suave mientras carga el primer frame */}
      {!hasMetadata && poster && !posterFailed && (
        <img
          src={poster}
          alt=""
          onError={() => setPosterFailed(true)}
          className="pointer-events-none absolute inset-0 w-full h-full object-contain bg-neutral-950"
        />
      )}

      {/* Indicador sutil de carga / buffering */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="w-11 h-11 rounded-full bg-neutral-950/75 border border-white/15 flex items-center justify-center shadow-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Botón central de Play cuando está pausado y listo */}
      {!compact && !isPlaying && !isBuffering && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label="Reproducir video"
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-neutral-950/65 hover:bg-neutral-950/80 border border-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-xl transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white translate-x-[1.5px]" />
        </button>
      )}

      {/* Dock de controles propio del sistema (Glassmorphism sobrio estilo Apple) */}
      {!compact && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-x-2.5 bottom-2.5 z-20 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            controlsVisible || !isPlaying || isScrubbing
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="rounded-xl bg-neutral-950/78 backdrop-blur-md border border-white/12 px-3 py-2 shadow-xl text-white">
            {/* Barra de progreso con scrubbing 1:1 */}
            <div
              ref={scrubberRef}
              onPointerDown={handleScrubPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              onPointerLeave={() => setHoverTime(null)}
              className="group/scrub relative h-4 flex items-center cursor-pointer touch-none mb-1"
            >
              {/* Tooltip de tiempo al pasar el cursor */}
              {hoverTime && duration > 0 && (
                <div
                  style={{ left: `${Math.min(92, Math.max(8, hoverTime.pct))}%` }}
                  className="pointer-events-none absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-neutral-900/95 border border-white/15 text-[10px] font-medium tabular-nums text-white shadow-md whitespace-nowrap"
                >
                  {formatTime(hoverTime.time)}
                </div>
              )}

              {/* Riel base */}
              <div className="relative w-full h-1 group-hover/scrub:h-1.5 transition-[height] duration-150 rounded-full bg-white/20 overflow-hidden">
                {/* Buffer */}
                <div
                  style={{ width: `${bufferedPct}%` }}
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                />
                {/* Reproducido */}
                <div
                  style={{ width: `${progressPct}%` }}
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                />
              </div>

              {/* Thumb */}
              <div
                style={{ left: `${progressPct}%` }}
                className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-150 ${
                  isScrubbing ? 'scale-110' : 'scale-0 group-hover/scrub:scale-100'
                }`}
              />
            </div>

            {/* Fila de botones y tiempo */}
            <div className="flex items-center justify-between gap-2">
              {/* Izquierda: Play, ±5s, Volumen, Tiempo */}
              <div className="flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  className="w-7 h-7 rounded-lg hover:bg-white/12 active:scale-95 flex items-center justify-center transition-[transform,background-color] duration-100 cursor-pointer shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white translate-x-[1px]" />
                  )}
                </button>

                {/* Saltos ±5s (ocultos en videos muy angostos) */}
                {!isPortrait && (
                  <>
                    <button
                      type="button"
                      onClick={() => skipSeconds(-5)}
                      title="Retroceder 5s"
                      className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-white/12 active:scale-95 items-center justify-center transition-[transform,background-color] duration-100 cursor-pointer shrink-0 text-white/80 hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => skipSeconds(5)}
                      title="Adelantar 5s"
                      className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-white/12 active:scale-95 items-center justify-center transition-[transform,background-color] duration-100 cursor-pointer shrink-0 text-white/80 hover:text-white"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Volumen */}
                <div className="group/vol flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                    className="w-7 h-7 rounded-lg hover:bg-white/12 active:scale-95 flex items-center justify-center transition-[transform,background-color] duration-100 cursor-pointer shrink-0 text-white/90 hover:text-white"
                  >
                    <VolumeIcon className="w-4 h-4" />
                  </button>
                  {!isPortrait && (
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      aria-label="Volumen"
                      className="hidden sm:block w-0 group-hover/vol:w-16 focus:w-16 transition-[width] duration-200 accent-white h-1 cursor-pointer opacity-0 group-hover/vol:opacity-100 focus:opacity-100"
                    />
                  )}
                </div>

                {/* Tiempo actual / duración */}
                <span className="text-[11px] font-medium tabular-nums text-white/85 pl-1 whitespace-nowrap truncate">
                  {formatTime(currentTime)}
                  <span className="text-white/45 mx-1">/</span>
                  <span className="text-white/65">{formatTime(duration)}</span>
                </span>
              </div>

              {/* Derecha: Comentar en timestamp, Velocidad, PiP, Pantalla completa */}
              <div className="flex items-center gap-1 shrink-0">
                {onTimestampComment && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = videoRef.current;
                      const secs = v ? v.currentTime : currentTime;
                      if (v && !v.paused) v.pause();
                      onTimestampComment(secs, formatTime(secs));
                    }}
                    title={`Comentar en ${formatTime(currentTime)}`}
                    className="h-7 px-2 rounded-lg bg-white/12 hover:bg-white/20 active:scale-95 text-[11px] font-semibold tabular-nums text-white flex items-center gap-1 transition-[transform,background-color] duration-100 cursor-pointer"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{formatTime(currentTime)}</span>
                  </button>
                )}

                {/* Selector de velocidad */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu((prev) => !prev)}
                    title="Velocidad de reproducción"
                    className="h-7 px-1.5 rounded-lg hover:bg-white/12 active:scale-95 text-[11px] font-semibold tabular-nums text-white/85 hover:text-white transition-[transform,background-color] duration-100 cursor-pointer"
                  >
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute right-0 bottom-9 py-1 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-white/15 shadow-xl min-w-[64px] z-30">
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setPlaybackRate(rate);
                            setShowSpeedMenu(false);
                          }}
                          className={`w-full px-2.5 py-1 text-left text-[11px] font-medium tabular-nums transition-colors cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-white/75 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Picture-in-Picture */}
                {!isPortrait && typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                  <button
                    type="button"
                    onClick={togglePiP}
                    title="Ventana flotante (PiP)"
                    className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-white/12 active:scale-95 items-center justify-center transition-[transform,background-color] duration-100 cursor-pointer text-white/80 hover:text-white"
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Pantalla completa */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
                  className="w-7 h-7 rounded-lg hover:bg-white/12 active:scale-95 flex items-center justify-center transition-[transform,background-color] duration-100 cursor-pointer text-white/85 hover:text-white"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

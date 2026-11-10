import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  ChevronDown,
  Search,
  ListMusic,
  Plus,
  Trash2,
  Music,
  Maximize2,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { Song, Playlist } from '../../types/music';
import { searchMusic, getSearchSuggestions } from '../../services/musicService';

interface AppleMusicWidgetProps {
  activeModule?: string;
}

export const AppleMusicWidget: React.FC<AppleMusicWidgetProps> = ({ activeModule }) => {
  const {
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
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    addToQueue,
    removeFromQueue,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    toggleFavorite,
    isFavorite,
    isWidgetVisible,
    setWidgetVisible,
  } = useMusicPlayer();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue' | 'playlists'>('player');

  // Mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleCheckMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleCheckMobile);
    return () => window.removeEventListener('resize', handleCheckMobile);
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // New playlist modal state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePl, setShowCreatePl] = useState(false);

  // Dragging state for the floating widget (anchored to bottom & right to expand upwards cleanly)
  const [offset, setOffset] = useState<{ right: number; bottom: number }>(() => ({
    right: 24,
    bottom: 24,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; right: number; bottom: number }>({
    startX: 0,
    startY: 0,
    right: 24,
    bottom: 24,
  });

  // Clamp offset within window on resize
  useEffect(() => {
    const handleResize = () => {
      const widgetWidth = isExpanded ? 370 : 340;
      const widgetHeight = isExpanded ? 520 : 64;
      setOffset((prev) => ({
        right: Math.max(12, Math.min(window.innerWidth - widgetWidth - 12, prev.right)),
        bottom: Math.max(12, Math.min(window.innerHeight - widgetHeight - 12, prev.bottom)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header or pill handle, avoid slider/buttons
    if ((e.target as HTMLElement).closest('button, input, a, .no-drag')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      right: offset.right,
      bottom: offset.bottom,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    const widgetWidth = isExpanded ? 370 : 340;
    const widgetHeight = isExpanded ? 520 : 64;

    const newRight = dragStartRef.current.right - deltaX;
    const newBottom = dragStartRef.current.bottom - deltaY;

    setOffset({
      right: Math.max(12, Math.min(window.innerWidth - widgetWidth - 12, newRight)),
      bottom: Math.max(12, Math.min(window.innerHeight - widgetHeight - 12, newBottom)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Search logic
  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    if (!q.trim()) return;

    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const results = await searchMusic(q);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  // Autocomplete debouncing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const list = await getSearchSuggestions(searchQuery);
      setSuggestions(list);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Si estamos en el Dashboard, ocultamos la píldora flotante para evitar duplicidad y estorbo
  if (activeModule === 'dashboard') {
    return null;
  }

  if (!isWidgetVisible) {
    return (
      <button
        onClick={() => setWidgetVisible(true)}
        className="fixed bottom-22 md:bottom-6 right-4 md:right-6 z-[9990] flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white shadow-xl backdrop-blur-xl border border-white/15 transition-all hover:scale-105 active:scale-95 group"
        title="Abrir reproductor de música"
      >
        <div className="relative">
          <Music className="w-4 h-4 md:w-5 md:h-5 text-rose-500 group-hover:rotate-12 transition-transform" />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          )}
        </div>
        <span className="text-xs font-semibold tracking-wide">Música</span>
      </button>
    );
  }

  return (
    <div
      style={
        isMobile
          ? {
              position: 'fixed',
              bottom: '84px',
              left: '12px',
              right: '12px',
              maxWidth: isExpanded ? '400px' : '350px',
              margin: '0 auto',
              zIndex: 9995,
            }
          : {
              right: `${offset.right}px`,
              bottom: `${offset.bottom}px`,
              position: 'fixed',
              zIndex: 9995,
            }
      }
      className={`select-none ${isMobile ? '' : 'touch-none'} transition-all duration-200 ease-out ${
        !isMobile && isDragging ? 'cursor-grabbing scale-[1.01]' : !isMobile ? 'cursor-grab' : ''
      }`}
      onPointerDown={isMobile ? undefined : handlePointerDown}
      onPointerMove={isMobile ? undefined : handlePointerMove}
      onPointerUp={isMobile ? undefined : handlePointerUp}
    >
      {/* 1. MODO PÍLDORA COMPACTA (Estilo Dynamic Island de Apple) */}
      {!isExpanded ? (
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-full bg-zinc-950/85 hover:bg-zinc-900/90 text-white backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all hover:shadow-[0_16px_50px_rgba(0,0,0,0.8)] max-w-[340px]">
          {/* Carátula */}
          <div
            onClick={() => setIsExpanded(true)}
            className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer bg-zinc-800 ring-1 ring-white/10 group"
          >
            {currentSong?.thumbnailUrl ? (
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500/20 to-purple-600/20">
                <Music className="w-5 h-5 text-rose-400" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-0.5">
                <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-0.5 h-4 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Información de la canción */}
          <div
            onClick={() => setIsExpanded(true)}
            className="flex-1 min-w-0 cursor-pointer pr-1"
          >
            <p className="text-xs font-semibold text-zinc-100 truncate leading-tight">
              {currentSong ? currentSong.title : 'Soundify Music'}
            </p>
            <p className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
              {currentSong ? currentSong.artist : 'Toca para abrir'}
            </p>
          </div>

          {/* Controles de reproducción */}
          <div className="flex items-center gap-1 flex-shrink-0 no-drag">
            <button
              onClick={togglePlayPause}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-transform active:scale-90 shadow-sm"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={playNext}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Siguiente pista"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
              title="Expandir reproductor"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setWidgetVisible(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors ml-0.5"
              title="Ocultar reproductor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* 2. MODO EXPANDIDO (Tarjeta Estilo Apple Music Glassmorphism) */
        <div className="w-[360px] max-w-[94vw] rounded-3xl bg-zinc-950/90 text-white backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col no-drag">
          {/* Header con botón minimizar, pestañas y cerrar */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2 border-b border-white/10 bg-white/[0.02]">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Minimizar a píldora"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            {/* Selector de pestañas estilo iOS */}
            <div className="flex items-center bg-zinc-900/80 p-0.5 rounded-xl border border-white/10 text-[11px] font-medium">
              <button
                onClick={() => setActiveTab('player')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'player'
                    ? 'bg-white/20 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Reproducir
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'search'
                    ? 'bg-white/20 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Buscar
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'queue'
                    ? 'bg-white/20 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Cola ({queue.length})
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'playlists'
                    ? 'bg-white/20 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Listas
              </button>
            </div>

            <button
              onClick={() => setWidgetVisible(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Ocultar widget"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* CUERPO PRINCIPAL SEGÚN PESTAÑA */}
          <div className="p-4 overflow-y-auto max-h-[460px] custom-scrollbar">
            {/* PESTAÑA 1: REPRODUCTOR APPLE MUSIC */}
            {activeTab === 'player' && (
              <div className="flex flex-col items-center">
                {/* Gran Carátula con Efecto Profundidad y Sombra */}
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7)] ring-1 ring-white/15 my-2 group bg-zinc-900">
                  {currentSong?.thumbnailUrl ? (
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 text-center">
                      <Music className="w-14 h-14 text-rose-500/80 mb-2" />
                      <p className="text-xs text-zinc-400">Sin reproducción activa</p>
                    </div>
                  )}
                </div>

                {/* Título y Artista */}
                <div className="w-full mt-3 px-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-zinc-100 truncate leading-snug">
                      {currentSong?.title || 'Selecciona una canción'}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {currentSong?.artist || 'Búscalo o elige de tus listas'}
                    </p>
                  </div>
                  {currentSong && (
                    <button
                      onClick={() => toggleFavorite(currentSong)}
                      className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
                        isFavorite(currentSong.id) ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                      }`}
                      title={isFavorite(currentSong.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite(currentSong.id) ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Barra de Progreso Deslizable */}
                <div className="w-full mt-4 px-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-rose-500 transition-colors"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-400 font-mono mt-1">
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{duration > 0 ? `-${formatSeconds(Math.max(0, duration - currentTime))}` : '--:--'}</span>
                  </div>
                </div>

                {/* Controles Principales Estilo Apple Music */}
                <div className="flex items-center justify-between w-full px-4 mt-3">
                  <button
                    onClick={toggleShuffle}
                    className={`p-2 rounded-full transition-colors ${
                      isShuffle ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white'
                    }`}
                    title={isShuffle ? 'Aleatorio activado' : 'Activar aleatorio'}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={playPrevious}
                    className="p-2.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-transform active:scale-90"
                    title="Pista anterior"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(255,255,255,0.25)]"
                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-1" />
                    )}
                  </button>

                  <button
                    onClick={playNext}
                    className="p-2.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-transform active:scale-90"
                    title="Pista siguiente"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    onClick={toggleRepeat}
                    className={`p-2 rounded-full transition-colors ${
                      repeatMode !== 'off' ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white'
                    }`}
                    title={
                      repeatMode === 'one'
                        ? 'Repetir canción actual'
                        : repeatMode === 'all'
                        ? 'Repetir toda la lista'
                        : 'Repetición desactivada'
                    }
                  >
                    {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                  </button>
                </div>

                {/* Control Deslizante de Volumen */}
                <div className="flex items-center gap-2.5 w-full px-4 mt-4">
                  <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-rose-500"
                  />
                  <span className="text-[11px] text-zinc-400 font-mono w-6 text-right">
                    {isMuted ? 0 : volume}%
                  </span>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: BUSCAR MÚSICA / PEGAR ENLACE */}
            {activeTab === 'search' && (
              <div className="flex flex-col gap-3">
                <form onSubmit={(e) => handleSearch(e)} className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar canción, artista o enlace YouTube..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </form>

                {/* Sugerencias en tiempo real */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="bg-zinc-900/95 border border-white/10 rounded-xl overflow-hidden p-1 shadow-lg">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(s);
                          handleSearch(undefined, s);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded-lg flex items-center gap-2"
                      >
                        <Search className="w-3 h-3 text-zinc-500" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Estado de carga */}
                {isSearching && (
                  <div className="py-8 flex flex-col items-center justify-center text-zinc-400 gap-2">
                    <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Buscando en YouTube...</span>
                  </div>
                )}

                {/* Lista de Resultados */}
                {!isSearching && searchResults.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
                      Resultados ({searchResults.length})
                    </p>
                    {searchResults.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 transition-colors group"
                      >
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-rose-400">
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              playSong(song);
                              setActiveTab('player');
                            }}
                            className="p-1.5 rounded-full bg-white text-black hover:bg-zinc-200 shadow-sm"
                            title="Reproducir ahora"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                          <button
                            onClick={() => addToQueue(song)}
                            className="p-1.5 rounded-full hover:bg-white/20 text-zinc-300 hover:text-white"
                            title="Agregar a la cola"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isSearching && searchResults.length === 0 && searchQuery && (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No se encontraron canciones. Intenta con otro término o pega el link de YouTube.
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA 3: COLA DE REPRODUCCIÓN */}
            {activeTab === 'queue' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <span className="text-xs font-semibold text-zinc-300">Pistas en espera</span>
                  <button
                    onClick={() => removeFromQueue(queueIndex)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Limpiar cola
                  </button>
                </div>

                {queue.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    La cola está vacía. Busca canciones para agregarlas.
                  </div>
                ) : (
                  queue.map((song, idx) => {
                    const isCurrent = idx === queueIndex;
                    return (
                      <div
                        key={`${song.id}-${idx}`}
                        className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${
                          isCurrent ? 'bg-white/15 border border-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className="w-5 text-center text-[11px] text-zinc-400 font-mono">
                          {idx + 1}
                        </span>
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-9 h-9 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-rose-400' : 'text-zinc-200'}`}>
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isCurrent && (
                            <button
                              onClick={() => playSong(song)}
                              className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white"
                              title="Reproducir"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeFromQueue(idx)}
                            className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-rose-400"
                            title="Eliminar de la cola"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* PESTAÑA 4: PLAYLISTS Y FAVORITOS */}
            {activeTab === 'playlists' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <span className="text-xs font-semibold text-zinc-300">Tus Playlists</span>
                  <button
                    onClick={() => setShowCreatePl(!showCreatePl)}
                    className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva
                  </button>
                </div>

                {showCreatePl && (
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva playlist..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setShowCreatePl(false)}
                        className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (newPlaylistName.trim()) {
                            createPlaylist(newPlaylistName);
                            setNewPlaylistName('');
                            setShowCreatePl(false);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                      >
                        Crear
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <ListMusic className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-100 truncate">{pl.name}</p>
                          <p className="text-[10px] text-zinc-400">{pl.songs.length} canciones</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {pl.songs.length > 0 && (
                          <button
                            onClick={() => {
                              playSong(pl.songs[0], pl);
                              setActiveTab('player');
                            }}
                            className="p-1.5 rounded-full bg-white text-black hover:bg-zinc-200"
                            title="Reproducir playlist"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                        )}
                        {currentSong && !pl.songs.some((s) => s.videoId === currentSong.videoId) && (
                          <button
                            onClick={() => addSongToPlaylist(pl.id, currentSong)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
                            title="Añadir canción actual"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {pl.id !== 'default-lofi' && (
                          <button
                            onClick={() => deletePlaylist(pl.id)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-rose-400"
                            title="Eliminar playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

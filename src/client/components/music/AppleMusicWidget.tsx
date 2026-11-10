import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { Song } from '../../types/music';
import { searchMusic, getSearchSuggestions } from '../../services/musicService';

interface AppleMusicWidgetProps {
  variant?: 'sidebar' | 'mobile-drawer';
  activeModule?: string;
}

export const AppleMusicWidget: React.FC<AppleMusicWidgetProps> = ({
  variant = 'sidebar',
}) => {
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
    clearQueue,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    toggleFavorite,
    isFavorite,
  } = useMusicPlayer();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue' | 'playlists'>('player');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // New playlist modal state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePl, setShowCreatePl] = useState(false);

  // Refs for PC sidebar docked anchoring & outside-click dismissal
  const dockRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; bottom: number }>({
    left: 280,
    bottom: 24,
  });

  const updatePopoverPosition = useCallback(() => {
    if (variant !== 'sidebar' || !dockRef.current || typeof window === 'undefined') return;
    const rect = dockRef.current.getBoundingClientRect();
    const cardWidth = 360;
    const cardMaxHeight = 540;

    // Posicionar justo al costado derecho del sidebar alineado con el bloque inferior
    const desiredLeft = Math.min(rect.right + 14, Math.max(12, window.innerWidth - cardWidth - 16));
    const desiredBottom = Math.min(
      Math.max(16, window.innerHeight - rect.bottom),
      Math.max(16, window.innerHeight - cardMaxHeight - 16)
    );

    setPopoverCoords({
      left: desiredLeft,
      bottom: desiredBottom,
    });
  }, [variant]);

  useEffect(() => {
    if (!isExpanded) return;

    updatePopoverPosition();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (variant !== 'sidebar') return;
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        dockRef.current &&
        !dockRef.current.contains(target)
      ) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, variant, updatePopoverPosition]);

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

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Tarjeta expandida reutilizable (para el popover lateral en PC y el modal en móvil)
  const renderExpandedPlayerCard = () => (
    <div
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
      className="w-[360px] max-w-[92vw] rounded-3xl bg-zinc-950/95 text-white backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col select-none animate-scaleUp"
    >
      {/* Header con botón minimizar, pestañas y cerrar */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-white/10 bg-white/[0.02] gap-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title={variant === 'mobile-drawer' ? 'Volver al botón' : 'Contraer al panel lateral'}
          aria-label="Contraer reproductor"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Selector de pestañas estilo iOS */}
        <div className="flex items-center bg-zinc-900/80 p-0.5 rounded-xl border border-white/10 text-[11px] font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'player'
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Reproducir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'queue'
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Cola ({queue.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('playlists')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'playlists'
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Listas
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          title="Cerrar reproductor"
          aria-label="Cerrar reproductor"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CUERPO PRINCIPAL SEGÚN PESTAÑA */}
      <div className="p-4 overflow-y-auto max-h-[min(460px,calc(100dvh-120px))] custom-scrollbar">
        {/* PESTAÑA 1: REPRODUCTOR APPLE MUSIC */}
        {activeTab === 'player' && (
          <div className="flex flex-col items-center">
            {/* Gran Carátula con Efecto Profundidad y Sombra */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7)] ring-1 ring-white/15 my-1.5 group bg-zinc-900">
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
                  type="button"
                  onClick={() => toggleFavorite(currentSong)}
                  className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
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
            <div className="flex items-center justify-between w-full px-4 mt-2.5">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isShuffle ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white'
                }`}
                title={isShuffle ? 'Aleatorio activado' : 'Activar aleatorio'}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={playPrevious}
                className="p-2.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-transform active:scale-90 cursor-pointer"
                title="Pista anterior"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(255,255,255,0.25)] cursor-pointer"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={playNext}
                className="p-2.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-transform active:scale-90 cursor-pointer"
                title="Pista siguiente"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              <button
                type="button"
                onClick={toggleRepeat}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
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
              <button
                type="button"
                onClick={toggleMute}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
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
              <span className="text-[11px] text-zinc-400 font-mono w-7 text-right">
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
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-white cursor-pointer"
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
                    type="button"
                    key={idx}
                    onClick={() => {
                      setSearchQuery(s);
                      handleSearch(undefined, s);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-zinc-500 shrink-0" />
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
                        type="button"
                        onClick={() => {
                          playSong(song);
                          setActiveTab('player');
                        }}
                        className="p-1.5 rounded-full bg-white text-black hover:bg-zinc-200 shadow-sm cursor-pointer"
                        title="Reproducir ahora"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addToQueue(song)}
                        className="p-1.5 rounded-full hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer"
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
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  Limpiar cola
                </button>
              )}
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
                          type="button"
                          onClick={() => playSong(song)}
                          className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
                          title="Reproducir"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFromQueue(idx)}
                        className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-rose-400 cursor-pointer"
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
                type="button"
                onClick={() => setShowCreatePl(!showCreatePl)}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
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
                    type="button"
                    onClick={() => setShowCreatePl(false)}
                    className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newPlaylistName.trim()) {
                        createPlaylist(newPlaylistName);
                        setNewPlaylistName('');
                        setShowCreatePl(false);
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
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
                        type="button"
                        onClick={() => {
                          playSong(pl.songs[0], pl);
                          setActiveTab('player');
                        }}
                        className="p-1.5 rounded-full bg-white text-black hover:bg-zinc-200 cursor-pointer"
                        title="Reproducir playlist"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    )}
                    {currentSong && !pl.songs.some((s) => s.videoId === currentSong.videoId) && (
                      <button
                        type="button"
                        onClick={() => addSongToPlaylist(pl.id, currentSong)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                        title="Añadir canción actual"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {pl.id !== 'default-lofi' && (
                      <button
                        type="button"
                        onClick={() => deletePlaylist(pl.id)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-rose-400 cursor-pointer"
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
  );

  // =========================================================================
  // VARIANTE 1: RESPONSIVE (MÓVIL) — BOTÓN DEBAJO DE LA "X" DEL MENÚ MÓVIL
  // =========================================================================
  if (variant === 'mobile-drawer') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`relative w-11 h-11 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 text-white border backdrop-blur-md shadow-xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
            isExpanded
              ? 'opacity-0 scale-75 pointer-events-none'
              : 'opacity-100 scale-100'
          } ${
            isPlaying
              ? 'border-rose-500/60 ring-2 ring-rose-500/25'
              : 'border-white/20'
          }`}
          aria-label="Abrir reproductor de música"
          title={currentSong ? `${currentSong.title} — ${currentSong.artist}` : 'Abrir reproductor de música'}
        >
          {currentSong?.thumbnailUrl && isPlaying ? (
            <div className="w-full h-full rounded-2xl overflow-hidden relative flex items-center justify-center">
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center gap-0.5">
                <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-0.5 h-4 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-2.5 bg-rose-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          ) : (
            <Music className="w-5 h-5 text-rose-400" />
          )}

          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 ring-2 ring-slate-950" />
            </span>
          )}
        </button>

        {isExpanded &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="md:hidden fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
              onClick={() => setIsExpanded(false)}
            >
              {renderExpandedPlayerCard()}
            </div>,
            document.body
          )}
      </>
    );
  }

  // =========================================================================
  // VARIANTE 2: PC (ESCRITORIO) — REPRODUCTOR FIJO EN EL SIDEBAR (NO FLOTANTE)
  // =========================================================================
  return (
    <div ref={dockRef} className="w-full select-none">
      <div
        className={`w-full rounded-2xl bg-zinc-950 dark:bg-zinc-900/95 text-white border transition-all shadow-sm overflow-hidden ${
          isExpanded
            ? 'border-rose-500/50 ring-2 ring-rose-500/20'
            : 'border-slate-800/80 dark:border-white/10 hover:border-white/25'
        }`}
      >
        <div className="flex items-center gap-2.5 p-2.5">
          {/* Carátula */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm flex-shrink-0 cursor-pointer bg-zinc-800 ring-1 ring-white/10 group"
            title="Abrir biblioteca y controles completos"
          >
            {currentSong?.thumbnailUrl ? (
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500/25 to-purple-600/25">
                <Music className="w-4 h-4 text-rose-400" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center gap-0.5">
                <span className="w-0.5 h-3 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Información de la canción */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex-1 min-w-0 cursor-pointer"
            title={currentSong ? `${currentSong.title} — ${currentSong.artist}` : 'Abrir reproductor'}
          >
            <p className="text-xs font-bold text-zinc-100 truncate leading-tight">
              {currentSong ? currentSong.title : 'Soundify Music'}
            </p>
            <p className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
              {currentSong ? currentSong.artist : 'Clic para buscar'}
            </p>
          </div>

          {/* Controles compactos integrados */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-transform active:scale-90 shadow-xs cursor-pointer"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={playNext}
              className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Siguiente pista"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isExpanded
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={isExpanded ? 'Contraer reproductor' : 'Expandir reproductor'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Barra de progreso sutil integrada */}
        {currentSong && duration > 0 && (
          <div className="h-0.5 w-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Panel completo acoplado al costado del sidebar cuando el usuario expande en PC */}
      {isExpanded &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="hidden md:block fixed z-[9990]"
            style={{
              left: `${popoverCoords.left}px`,
              bottom: `${popoverCoords.bottom}px`,
            }}
          >
            {renderExpandedPlayerCard()}
          </div>,
          document.body
        )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Music,
  Search,
  Play,
  Pause,
  Plus,
  Trash2,
  Heart,
  ListMusic,
  Radio,
  Sparkles,
  ChevronLeft,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Shuffle,
  Headphones,
  ListPlus,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import { useMusicPlayer } from '../../../../context/MusicPlayerContext';
import { useApp } from '../../../../context/AppContext';
import { Song, Playlist } from '../../../../types/music';
import { searchMusic } from '../../../../services/musicService';

interface MusicSubmoduleViewProps {
  onBackToHub?: () => void;
}

export const MusicSubmoduleView: React.FC<MusicSubmoduleViewProps> = ({ onBackToHub }) => {
  const { user, tenant } = useApp();
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
    playlists,
    favorites,
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
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    toggleFavorite,
    isFavorite,
    setIsMusicSubmoduleOpen,
  } = useMusicPlayer();

  useEffect(() => {
    setIsMusicSubmoduleOpen(true);
    return () => setIsMusicSubmoduleOpen(false);
  }, [setIsMusicSubmoduleOpen]);

  const [activeTab, setActiveTab] = useState<'explore' | 'search' | 'playlists' | 'favorites'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal para añadir canción a Playlist
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [newModalPlName, setNewModalPlName] = useState<string>('');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // Modales de Crear y Editar Playlist
  const [isCreatingPl, setIsCreatingPl] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [newPlDesc, setNewPlDesc] = useState('');

  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Selected playlist view
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMusic(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSongToExistingPlaylist = (pl: Playlist) => {
    if (!songToAddToPlaylist) return;
    addSongToPlaylist(pl.id, songToAddToPlaylist);
    setAddedFeedback(`¡Añadida a "${pl.name}"!`);
    if (selectedPlaylist && selectedPlaylist.id === pl.id) {
      setSelectedPlaylist((prev) => (prev ? { ...prev, songs: [...prev.songs, songToAddToPlaylist] } : null));
    }
    setTimeout(() => {
      setSongToAddToPlaylist(null);
      setAddedFeedback(null);
    }, 280);
  };

  const handleCreateAndAdd = () => {
    if (!newModalPlName.trim() || !songToAddToPlaylist) return;
    const newPl = createPlaylist(newModalPlName.trim());
    addSongToPlaylist(newPl.id, songToAddToPlaylist);
    setNewModalPlName('');
    setAddedFeedback(`¡Lista "${newPl.name}" creada y añadida!`);
    setTimeout(() => {
      setSongToAddToPlaylist(null);
      setAddedFeedback(null);
    }, 280);
  };

  const handleOpenEdit = (pl: Playlist, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlaylistToEdit(pl);
    setEditName(pl.name);
    setEditDesc(pl.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistToEdit || !editName.trim()) return;
    updatePlaylist(playlistToEdit.id, {
      name: editName.trim(),
      description: editDesc.trim(),
    });
    if (selectedPlaylist && selectedPlaylist.id === playlistToEdit.id) {
      setSelectedPlaylist((prev) => (prev ? { ...prev, name: editName.trim(), description: editDesc.trim() } : null));
    }
    setPlaylistToEdit(null);
  };

  const handleDeletePlaylist = (pl: Playlist, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`¿Estás seguro de que deseas eliminar la playlist "${pl.name}"?`)) {
      deletePlaylist(pl.id);
      if (selectedPlaylist && selectedPlaylist.id === pl.id) {
        setSelectedPlaylist(null);
      }
    }
  };

  const CURATED_LISTS = [
    {
      title: 'Lofi Beats para Trabajar',
      artist: 'Lofi Girl / ChilledCow',
      videoId: 'jfKfPfyJRdk',
      tag: 'Concentración',
      color: 'from-amber-500/20 to-rose-500/20 border-amber-500/30',
      thumb: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    },
    {
      title: 'Deep Focus & Ambient Coding',
      artist: 'Synthwave / Retrowave',
      videoId: '4xDzrJKXOOY',
      tag: 'Programación',
      color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
      thumb: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    },
    {
      title: 'Piano Acústico & Relax Studio',
      artist: 'Instrumental',
      videoId: 'kgx4WGK0oNU',
      tag: 'Diseño Creativo',
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
      thumb: 'https://i.ytimg.com/vi/kgx4WGK0oNU/hqdefault.jpg',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-24 md:pb-8">
      {/* 1. CABECERA PRINCIPAL CON BOTÓN RETORNO AL HUB */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Volver al Hub"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> Workspace Music & Soundify
            </span>
            {user && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5">
                Biblioteca personal de <strong className="text-slate-800 dark:text-slate-100">{user.name}</strong>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Música para el Equipo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Escucha música sin salir del sistema, crea playlists personalizadas y encuentra canciones de YouTube con reproducción continua en segundo plano.
          </p>
        </div>

        {/* Mini status reproductor */}
        {currentSong && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 max-w-sm">
            <img
              src={currentSong.thumbnailUrl}
              alt={currentSong.title}
              className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                {isPlaying ? 'Reproduciendo' : 'En Pausa'}
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentSong.title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentSong.artist}
              </p>
            </div>
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>
        )}
      </div>

      {/* 2. BARRA DE NAVEGACIÓN INTERNA DE SUBMÓDULO */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab('explore');
            setSelectedPlaylist(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'explore' && !selectedPlaylist
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Explorar & Focus
        </button>

        <button
          onClick={() => {
            setActiveTab('search');
            setSelectedPlaylist(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'search'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" /> Buscar en YouTube
        </button>

        <button
          onClick={() => {
            setActiveTab('playlists');
            setSelectedPlaylist(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'playlists' || selectedPlaylist
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ListMusic className="w-4 h-4" /> Playlists ({playlists.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('favorites');
            setSelectedPlaylist(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'favorites'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" /> Favoritos ({favorites.length})
        </button>
      </div>

      {/* 3. CONTENIDO SEGÚN PESTAÑA */}

      {/* A. EXPLORAR & SELECCIONES FOCUS */}
      {activeTab === 'explore' && !selectedPlaylist && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500" /> Transmisiones y Mezclas Focus Recomendadas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CURATED_LISTS.map((c, i) => {
                const curatedSong: Song = {
                  id: c.videoId,
                  videoId: c.videoId,
                  title: c.title,
                  artist: c.artist,
                  thumbnailUrl: c.thumb,
                  duration: 0,
                  addedAt: Date.now(),
                };
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-3xl bg-gradient-to-br ${c.color} border transition-all hover:scale-[1.02] flex flex-col justify-between group`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={c.thumb}
                        alt={c.title}
                        className="w-14 h-14 rounded-2xl object-cover shadow-md flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/40 dark:bg-black/30 backdrop-blur-xs">
                          {c.tag}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1">
                          {c.title}
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          {c.artist}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                      <button
                        onClick={() => playSong(curatedSong)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Reproducir
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSongToAddToPlaylist(curatedSong)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                          title="Añadir a playlist"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => addToQueue(curatedSong)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                          title="Añadir a la cola"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acceso Rápido a Playlists de Trabajo */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-indigo-500" /> Tus Listas de Reproducción
              </h2>
              <button
                onClick={() => {
                  setActiveTab('playlists');
                  setIsCreatingPl(true);
                }}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Playlist
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-600/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-500 group-hover:scale-105 transition-transform">
                      <Music className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {pl.songs.length} {pl.songs.length === 1 ? 'canción' : 'canciones'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {pl.songs.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playSong(pl.songs[0], pl);
                        }}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors"
                        title="Reproducir lista"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(pl, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Editar playlist"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeletePlaylist(pl, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Eliminar playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* B. BUSCADOR INTEGRADO DE YOUTUBE */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canciones, artistas o pegar enlace de YouTube..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {isSearching && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Consultando YouTube...</span>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.map((song) => (
                <div
                  key={song.id}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={song.thumbnailUrl}
                      alt={song.title}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-slate-200 dark:bg-slate-800"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => playSong(song)}
                      className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 transition-transform"
                      title="Reproducir ahora"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSongToAddToPlaylist(song)}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1"
                      title="Añadir a una Playlist"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => addToQueue(song)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Añadir a la cola de reproducción"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(song)}
                      className={`p-2 rounded-xl border transition-colors ${
                        isFavorite(song.id)
                          ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                      }`}
                      title="Guardar en favoritos"
                    >
                      <Heart className={`w-4 h-4 ${isFavorite(song.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* C. GESTIÓN DE PLAYLISTS */}
      {(activeTab === 'playlists' || selectedPlaylist) && (
        <div className="space-y-4">
          {selectedPlaylist ? (
            /* Vista detallada de una Playlist */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedPlaylist(null)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" /> Todas las playlists
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(selectedPlaylist, e)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePlaylist(selectedPlaylist, e)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                  {selectedPlaylist.songs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => playSong(selectedPlaylist.songs[0], selectedPlaylist)}
                      className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs flex items-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Reproducir Todo ({selectedPlaylist.songs.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-600/20 border border-rose-500/30 flex items-center justify-center text-rose-500">
                    <ListMusic className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedPlaylist.name}
                    </h2>
                    {selectedPlaylist.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedPlaylist.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {selectedPlaylist.songs.length} pistas guardadas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Buscar y Añadir
                </button>
              </div>

              {selectedPlaylist.songs.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs space-y-2">
                  <p>Esta playlist no tiene canciones todavía.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" /> Buscar canciones en YouTube
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPlaylist.songs.map((song, idx) => (
                    <div
                      key={`${song.id}-${idx}`}
                      className="py-2 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 text-center text-xs font-mono text-slate-400">
                          {idx + 1}
                        </span>
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {song.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => playSong(song, selectedPlaylist)}
                          className="p-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 transition-transform"
                          title="Reproducir"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeSongFromPlaylist(selectedPlaylist.id, song.id);
                            setSelectedPlaylist((prev) =>
                              prev
                                ? { ...prev, songs: prev.songs.filter((s) => s.id !== song.id) }
                                : null
                            );
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                          title="Quitar de esta playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Lista de todas las Playlists */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Todas las Playlists
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingPl(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear Playlist
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPlaylist(pl)}
                    className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/20 flex items-center justify-center text-rose-500 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <ListMusic className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {pl.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {pl.songs.length} pistas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {pl.songs.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playSong(pl.songs[0], pl);
                          }}
                          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors"
                          title="Reproducir lista"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(pl, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar playlist"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePlaylist(pl, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Eliminar playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* D. FAVORITOS */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-current" /> Canciones que te gustan
            </h3>
            {favorites.length > 0 && (
              <button
                type="button"
                onClick={() => playSong(favorites[0])}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Reproducir Favoritos
              </button>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
              Aún no has marcado canciones como favoritas. Pulsa el corazón en cualquier canción para guardarla aquí.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {favorites.map((song, idx) => (
                <div
                  key={`${song.id}-${idx}`}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={song.thumbnailUrl}
                      alt={song.title}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playSong(song)}
                      className="p-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSongToAddToPlaylist(song)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Añadir a playlist"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(song)}
                      className="p-1.5 rounded-lg text-rose-500"
                      title="Quitar de favoritos"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES EN PORTAL (document.body) PARA NO QUEDAR ATRAPADOS EN CONTENEDORES */}
      {/* ========================================================================= */}

      {/* 1. MODAL: AÑADIR CANCIÓN A PLAYLIST */}
      {typeof document !== 'undefined' &&
        songToAddToPlaylist &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-rose-500" /> Añadir a Playlist
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSongToAddToPlaylist(null);
                    setAddedFeedback(null);
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ficha de la canción */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <img
                  src={songToAddToPlaylist.thumbnailUrl}
                  alt={songToAddToPlaylist.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {songToAddToPlaylist.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {songToAddToPlaylist.artist}
                  </p>
                </div>
              </div>

              {addedFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{addedFeedback}</span>
                </div>
              )}

              {/* Listas existentes */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Selecciona la playlist de destino:
                </p>
                {playlists.map((pl) => {
                  const isAlreadyIn = pl.songs.some(
                    (s) => s.id === songToAddToPlaylist.id || s.videoId === songToAddToPlaylist.videoId
                  );
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => handleAddSongToExistingPlaylist(pl)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500 flex-shrink-0">
                          <ListMusic className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {pl.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {pl.songs.length} canciones
                          </p>
                        </div>
                      </div>
                      {isAlreadyIn ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Ya agregada
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
                          Añadir
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Crear nueva lista al vuelo */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Crear nueva lista..."
                  value={newModalPlName}
                  onChange={(e) => setNewModalPlName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleCreateAndAdd}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear y Añadir
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2. MODAL: CREAR PLAYLIST */}
      {typeof document !== 'undefined' &&
        isCreatingPl &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-rose-500" /> Crear Nueva Playlist
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingPl(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nombre de la Playlist *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Cumbias para Diseñar, Rock Clásico..."
                    value={newPlName}
                    onChange={(e) => setNewPlName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Para qué momento del día o proyecto..."
                    value={newPlDesc}
                    onChange={(e) => setNewPlDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingPl(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newPlName.trim()) {
                      const pl = createPlaylist(newPlName, newPlDesc);
                      setNewPlName('');
                      setNewPlDesc('');
                      setIsCreatingPl(false);
                      setSelectedPlaylist(pl);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Crear Playlist
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 3. MODAL: EDITAR PLAYLIST */}
      {typeof document !== 'undefined' &&
        playlistToEdit &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-500" /> Editar Playlist
                </h3>
                <button
                  type="button"
                  onClick={() => setPlaylistToEdit(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nombre de la Playlist *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPlaylistToEdit(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

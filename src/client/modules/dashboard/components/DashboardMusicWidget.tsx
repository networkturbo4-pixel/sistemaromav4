import React, { useState } from 'react';
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
  ChevronUp,
  Music,
  Search,
  ExternalLink,
  Headphones,
} from 'lucide-react';
import { useMusicPlayer } from '../../../context/MusicPlayerContext';
import { searchMusic } from '../../../services/musicService';

interface DashboardMusicWidgetProps {
  onOpenWorkspaceMusic?: () => void;
}

export const DashboardMusicWidget: React.FC<DashboardMusicWidgetProps> = ({ onOpenWorkspaceMusic }) => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleFavorite,
    isFavorite,
  } = useMusicPlayer();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('roma_dashboard_music_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [quickResults, setQuickResults] = useState<any[]>([]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('roma_dashboard_music_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchMusic(searchQuery);
      setQuickResults(res.slice(0, 4));
    } finally {
      setIsSearching(false);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between">
      {/* Header del Widget */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              Música & Focus
              {isPlaying && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Reproducción en segundo plano
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenWorkspaceMusic && (
            <button
              type="button"
              onClick={onOpenWorkspaceMusic}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Abrir módulo de Música en Workspace"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title={isCollapsed ? 'Desplegar widget' : 'Plegar widget'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Si está plegado: vista compacta */}
      {isCollapsed ? (
        <div className="pt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentSong?.thumbnailUrl ? (
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Music className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentSong ? currentSong.title : 'Sin reproducción'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {currentSong ? currentSong.artist : 'Despliega para elegir'}
              </p>
            </div>
          </div>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xs flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        </div>
      ) : (
        /* Vista Desplegada en 1 Columna (Estilo Apple Music Card) */
        <div className="pt-4 space-y-4">
          {/* Carátula y Metadatos */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/10 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
              {currentSong?.thumbnailUrl ? (
                <img
                  src={currentSong.thumbnailUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Music className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  {isPlaying ? 'Reproduciendo' : 'En Pausa'}
                </span>
                {currentSong && (
                  <button
                    onClick={() => toggleFavorite(currentSong)}
                    className={`p-1 transition-colors ${
                      isFavorite(currentSong.id) ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFavorite(currentSong.id) ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1">
                {currentSong ? currentSong.title : 'Selecciona una pista'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentSong ? currentSong.artist : 'Soundify Music'}
              </p>
            </div>
          </div>

          {/* Barra de Tiempo */}
          <div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>{formatSeconds(currentTime)}</span>
              <span>{duration > 0 ? `-${formatSeconds(Math.max(0, duration - currentTime))}` : '--:--'}</span>
            </div>
          </div>

          {/* Controles Principales */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-colors ${
                isShuffle ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Aleatorio"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={playPrevious}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95"
              title="Anterior"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={playNext}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95"
              title="Siguiente"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-lg transition-colors ${
                repeatMode !== 'off' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Repetir"
            >
              {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Control de Volumen y Búsqueda Rápida */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <span className="text-[10px] text-slate-400 font-mono w-6 text-right">
                {isMuted ? 0 : volume}%
              </span>
            </div>

            <form onSubmit={handleQuickSearch} className="relative">
              <input
                type="text"
                placeholder="Buscar en YouTube..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </form>

            {quickResults.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 space-y-1">
                {quickResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      playSong(s);
                      setQuickResults([]);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-[11px]"
                  >
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200 max-w-[200px]">
                      {s.title}
                    </span>
                    <Play className="w-3 h-3 text-rose-500 fill-current flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

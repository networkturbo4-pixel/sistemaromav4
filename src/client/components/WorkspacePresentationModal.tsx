import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Copy, Check, 
  Users, Calendar, Sparkles, Share2, Layers, PlayCircle, Eye
} from 'lucide-react';
import { UniversalMediaEmbed } from './UniversalMediaEmbed';

interface TeamMember {
  id?: string;
  name?: string;
  role?: string;
  avatar?: string;
}

interface WorkspacePost {
  id: string;
  code?: string;
  title: string;
  concept?: string;
  caption?: string;
  copy?: string;
  pillar?: string;
  format?: string;
  status: string;
  platforms?: string[];
  scheduledDate?: string;
  finalArtMediaUrl?: string;
  referenceMediaUrl?: string;
  designerBrief?: string;
  notes?: string;
}

interface WorkspacePresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: WorkspacePost[];
  projectName: string;
  monthName: string;
  clientName?: string;
  agencyLogo?: string;
  agencyName?: string;
  assignedMembers?: TeamMember[];
}

export const WorkspacePresentationModal: React.FC<WorkspacePresentationModalProps> = ({
  isOpen,
  onClose,
  posts,
  projectName,
  monthName,
  clientName,
  agencyLogo,
  agencyName = 'Roma Agencia',
  assignedMembers = []
}) => {
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = Cover, 1..N = Posts
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'final' | 'ref'>('final');

  const totalSlides = posts.length + 1; // Slide 0 is cover

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Reset slide on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCopy(true);
    setTimeout(() => setCopiedCopy(false), 2000);
  };

  if (!isOpen) return null;

  const currentPost = currentSlide > 0 ? posts[currentSlide - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {agencyLogo ? (
              <img src={agencyLogo} alt="Logo" className="h-7 w-auto object-contain max-w-[100px]" />
            ) : (
              <span className="font-black text-lg tracking-wider text-primary-400">ROMA.</span>
            )}
            <span className="hidden sm:inline text-xs text-slate-400 font-medium border-l border-slate-700 pl-3">
              {projectName} • <span className="text-white font-semibold">{monthName}</span>
            </span>
          </div>
        </div>

        {/* Slide indicator & Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            {currentSlide === 0 ? 'Portada' : `Post ${currentSlide} de ${posts.length}`}
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Cerrar presentación (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Deck Area */}
      <div className="flex-1 relative overflow-y-auto flex items-center justify-center p-3 sm:p-6 lg:p-10">
        {/* SLIDE 0: COVER */}
        {currentSlide === 0 && (
          <div className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-primary-950/40 border border-slate-800 rounded-3xl p-6 sm:p-12 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            {/* Agency Brand */}
            <div className="mb-8">
              {agencyLogo ? (
                <img src={agencyLogo} alt="Agency Logo" className="h-16 sm:h-20 w-auto object-contain mx-auto drop-shadow-md" />
              ) : (
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  ROMA<span className="text-primary-500">.</span>
                </div>
              )}
              <span className="inline-block mt-2 px-3 py-1 bg-primary-500/10 border border-primary-500/30 text-primary-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                Presentación de Contenidos Digitales
              </span>
            </div>

            {/* Project & Month Details */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-3">
              {projectName}
            </h1>
            <p className="text-lg sm:text-xl font-medium text-primary-400 mb-2">
              {monthName}
            </p>
            {clientName && (
              <p className="text-sm sm:text-base text-slate-400 mb-8">
                Cliente / Marca: <span className="text-slate-200 font-semibold">{clientName}</span>
              </p>
            )}

            {/* Team Members Section */}
            {assignedMembers && assignedMembers.length > 0 && (
              <div className="w-full max-w-xl bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-2xl p-4 sm:p-6 mb-8 text-left">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  <Users className="w-4 h-4 text-primary-400" />
                  <span>Equipo Asignado al Proyecto</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignedMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/40">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-500/40" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-sm">
                          {member.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-white truncate">{member.name || 'Miembro'}</div>
                        <div className="text-[11px] text-slate-400 truncate">{member.role || 'Especialista'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-3 px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 active:scale-95 transition-all"
            >
              <span>Ver Grilla de Contenidos ({posts.length} posts)</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* SLIDES 1..N: INDIVIDUAL POSTS */}
        {currentSlide > 0 && currentPost && (
          <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-full max-h-[82vh] animate-in zoom-in-95 duration-200">
            {/* Left Column: Media / Video Embed */}
            <div className="flex-1 bg-black/60 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden relative">
              {/* Media Switch Tabs */}
              <div className="flex items-center justify-between p-3 bg-slate-900/80 border-b border-slate-800 z-10">
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('final')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeMediaTab === 'final'
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Arte Final
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('ref')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeMediaTab === 'ref'
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Referencia / Boceto
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Compatible con TikTok, Facebook, Drive, YouTube y más
                </span>
              </div>

              {/* Embed / Viewer */}
              <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
                <UniversalMediaEmbed
                  url={activeMediaTab === 'final' ? (currentPost.finalArtMediaUrl || currentPost.referenceMediaUrl) : (currentPost.referenceMediaUrl || currentPost.finalArtMediaUrl)}
                  className="w-full max-h-full"
                  alt={currentPost.title}
                />
              </div>
            </div>

            {/* Right Column: Copy & Post Details */}
            <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-slate-900/90 overflow-hidden">
              {/* Post Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider uppercase bg-primary-950/60 text-primary-400 border border-primary-500/30 px-2.5 py-1 rounded-lg">
                    {currentPost.code || `POST #${String(currentSlide).padStart(2, '0')}`}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase bg-slate-800 text-slate-300">
                    {currentPost.status}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-2">
                  {currentPost.title || currentPost.concept || 'Publicación sin título'}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                  {currentPost.pillar && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {currentPost.pillar}
                    </span>
                  )}
                  {currentPost.scheduledDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary-400" />
                      <span>{currentPost.scheduledDate}</span>
                    </span>
                  )}
                  {currentPost.platforms && currentPost.platforms.length > 0 && (
                    <div className="flex items-center gap-1">
                      {currentPost.platforms.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">
                          {p.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Copy Body */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Copy del Post
                    </span>
                    {(currentPost.caption || currentPost.copy) && (
                      <button
                        onClick={() => copyToClipboard(currentPost.caption || currentPost.copy || '')}
                        className="flex items-center gap-1 text-[11px] font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        {copiedCopy ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCopy ? 'Copiado' : 'Copiar Texto'}</span>
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-normal">
                    {currentPost.caption || currentPost.copy || (
                      <span className="text-slate-500 italic">No hay copy registrado para esta publicación.</span>
                    )}
                  </div>
                </div>

                {/* Brief or Notes if present */}
                {(currentPost.designerBrief || currentPost.notes) && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Indicaciones Creativas
                    </span>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs text-slate-300 whitespace-pre-wrap select-text">
                      {currentPost.designerBrief || currentPost.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-slate-900 border-t border-slate-800 z-10">
        <button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs sm:text-sm font-semibold transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        {/* Thumbnail or Dots pagination */}
        <div className="flex items-center gap-1.5 max-w-md overflow-x-auto py-1 px-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`transition-all rounded-full ${
                currentSlide === idx
                  ? 'w-6 h-2 bg-primary-500'
                  : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={idx === 0 ? 'Portada' : `Slide ${idx}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentSlide === totalSlides - 1}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-md shadow-primary-500/20"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Share2,
  Repeat2,
  Music2,
  Globe,
  ThumbsUp,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { WorkspacePost } from '../../../../../shared/types';
import { stripHtmlToCleanText } from '../../../../utils/textFormat';

interface SocialFeedMockupProps {
  post: Partial<WorkspacePost>;
  tenant: { name: string; logoUrl?: string };
  activePlatform: 'instagram' | 'facebook' | 'tiktok' | 'x';
  setActivePlatform: (platform: 'instagram' | 'facebook' | 'tiktok' | 'x') => void;
  onOpenLightbox?: (url: string) => void;
}

export const SocialFeedMockup: React.FC<SocialFeedMockupProps> = ({
  post,
  tenant,
  activePlatform,
  setActivePlatform,
  onOpenLightbox,
}) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cleanCopy = stripHtmlToCleanText(post.copy || '');
  const brandName = post.brandName || tenant.name || 'Tu Marca';
  const handleName = brandName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const mediaUrl = post.finalArtMediaUrl || post.referenceMediaUrl || post.mediaUrl;
  const isReferenceOnly = !post.finalArtMediaUrl && !!post.referenceMediaUrl;

  // Format hashtags with styling
  const renderFormattedCopy = (text: string) => {
    if (!text) {
      return (
        <span className="text-slate-400 italic font-normal">
          Sin texto de publicación todavía. Escribe tu copy a la izquierda...
        </span>
      );
    }
    const parts = text.split(/(#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3">
      {/* Switcher de Red Social para la Vista Previa */}
      <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        {[
          { id: 'instagram', label: 'Instagram', icon: '📸', activeBg: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white' },
          { id: 'facebook', label: 'Facebook', icon: '📘', activeBg: 'bg-[#1877F2] text-white' },
          { id: 'tiktok', label: 'TikTok', icon: '🎵', activeBg: 'bg-black text-white dark:bg-slate-900 border border-slate-700' },
          { id: 'x', label: 'X', icon: '𝕏', activeBg: 'bg-slate-950 text-white' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivePlatform(item.id as any)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              activePlatform === item.id
                ? `${item.activeBg} shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Frame del Simulador Social */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md max-w-sm mx-auto text-xs transition-all">
        {/* ======================================================== */}
        {/* 1. MOCKUP INSTAGRAM */}
        {/* ======================================================== */}
        {activePlatform === 'instagram' && (
          <div className="flex flex-col">
            {/* Header Instagram */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100 dark:border-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shrink-0">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-0.5 overflow-hidden flex items-center justify-center">
                    {tenant.logoUrl ? (
                      <img src={tenant.logoUrl} alt={brandName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">
                        {brandName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-900 dark:text-white text-[12px]">{handleName}</span>
                    <CheckCircle className="w-3 h-3 text-sky-500 fill-sky-500" />
                  </div>
                  <span className="text-[10px] text-slate-400 block -mt-0.5">Publicidad / Contenido</span>
                </div>
              </div>
              <button type="button" className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Media Container */}
            <div className="relative bg-slate-100 dark:bg-slate-900 aspect-square flex items-center justify-center overflow-hidden">
              {mediaUrl && !imgError ? (
                <img
                  src={mediaUrl}
                  alt={post.title || 'Post Media'}
                  onError={() => setImgError(true)}
                  onClick={() => onOpenLightbox && onOpenLightbox(mediaUrl)}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.02] transition-transform"
                />
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold">Vista previa de imagen</p>
                  <p className="text-[10px] text-slate-400">Sube una referencia o arte final para ver el post</p>
                </div>
              )}

              {/* Watermark badge if reference only */}
              {isReferenceOnly && (
                <span className="absolute top-2.5 left-2.5 bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  ● Boceto / Referencia
                </span>
              )}
            </div>

            {/* Action Bar */}
            <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setLiked(!liked)}
                  className={`transition-transform active:scale-125 cursor-pointer ${
                    liked ? 'text-rose-500 fill-rose-500' : 'text-slate-800 dark:text-white hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                </button>
                <button type="button" className="text-slate-800 dark:text-white hover:text-indigo-500 transition cursor-pointer">
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button type="button" className="text-slate-800 dark:text-white hover:text-indigo-500 transition cursor-pointer">
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSaved(!saved)}
                className={`transition cursor-pointer ${
                  saved ? 'text-indigo-600 fill-indigo-600' : 'text-slate-800 dark:text-white hover:text-indigo-600'
                }`}
              >
                <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Likes */}
            <div className="px-3.5 text-[11px] font-extrabold text-slate-900 dark:text-white">
              {liked ? '1,421' : '1,420'} Me gusta
            </div>

            {/* Caption */}
            <div className="px-3.5 pt-1.5 pb-3 space-y-1">
              <div className="text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                <span className="font-extrabold mr-1.5 text-slate-900 dark:text-white">{handleName}</span>
                {renderFormattedCopy(cleanCopy)}
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400 block pt-1">
                HACE 2 HORAS
              </span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. MOCKUP FACEBOOK */}
        {/* ======================================================== */}
        {activePlatform === 'facebook' && (
          <div className="flex flex-col">
            {/* Header Facebook */}
            <div className="flex items-center justify-between px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  {tenant.logoUrl ? (
                    <img src={tenant.logoUrl} alt={brandName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-sm text-[#1877F2]">{brandName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-900 dark:text-white text-[12px]">{brandName}</span>
                    <CheckCircle className="w-3 h-3 text-[#1877F2] fill-[#1877F2]" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>Hace 1 h</span>
                    <span>•</span>
                    <Globe className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Caption on top */}
            <div className="px-3.5 pb-2.5 text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderFormattedCopy(cleanCopy)}
            </div>

            {/* Media Container */}
            <div className="relative bg-slate-100 dark:bg-slate-900 aspect-square flex items-center justify-center overflow-hidden border-y border-slate-100 dark:border-slate-900">
              {mediaUrl && !imgError ? (
                <img
                  src={mediaUrl}
                  alt={post.title || 'Post'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto" />
                  <p className="text-[11px] font-bold">Vista previa de imagen</p>
                </div>
              )}
            </div>

            {/* Facebook Action Bar */}
            <div className="flex items-center justify-around py-2 px-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition ${
                  liked ? 'text-[#1877F2] font-black' : ''
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                <span>Me gusta</span>
              </button>
              <button
                type="button"
                className="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Comentar</span>
              </button>
              <button
                type="button"
                className="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. MOCKUP TIKTOK */}
        {/* ======================================================== */}
        {activePlatform === 'tiktok' && (
          <div className="flex flex-col bg-slate-950 text-white relative min-h-[460px] rounded-3xl overflow-hidden">
            {/* Background Media */}
            <div className="absolute inset-0 z-0">
              {mediaUrl && !imgError ? (
                <img
                  src={mediaUrl}
                  alt={post.title || 'TikTok'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover filter brightness-90"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
            </div>

            {/* Right side interaction buttons */}
            <div className="absolute right-2.5 bottom-16 z-10 flex flex-col items-center gap-4 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden p-0.5 bg-black">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={brandName} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="font-black text-xs text-white flex items-center justify-center h-full">
                    {brandName.charAt(0)}
                  </span>
                )}
              </div>

              <button type="button" onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
                <div className={`p-2 rounded-full bg-black/40 backdrop-blur-xs ${liked ? 'text-pink-500' : 'text-white'}`}>
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-[10px] font-bold text-white shadow-xs">24.5k</span>
              </button>

              <div className="flex flex-col items-center gap-0.5">
                <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs text-white">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-white shadow-xs">312</span>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs text-white">
                  <Bookmark className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-white shadow-xs">1.8k</span>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs text-white">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-white shadow-xs">Share</span>
              </div>
            </div>

            {/* Bottom Caption & Music */}
            <div className="mt-auto relative z-10 p-4 pr-16 space-y-2 text-left">
              <div className="flex items-center gap-1.5 font-extrabold text-[12px] text-white">
                <span>@{handleName}</span>
                <span className="text-[9px] bg-pink-500 text-white px-1.5 py-0.2 rounded">Seguir</span>
              </div>
              <p className="text-[11px] text-white/90 line-clamp-3 leading-snug">
                {renderFormattedCopy(cleanCopy)}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/70">
                <Music2 className="w-3.5 h-3.5 animate-spin" />
                <span className="truncate">Sonido original - {brandName} Oficial</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. MOCKUP X / TWITTER */}
        {/* ======================================================== */}
        {activePlatform === 'x' && (
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={brandName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xs">{brandName.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 truncate">
                    <span className="font-extrabold text-slate-900 dark:text-white text-[12px] truncate">{brandName}</span>
                    <span className="text-slate-400 text-[11px]">@{handleName}</span>
                    <span className="text-slate-400 text-[10px]">• 1h</span>
                  </div>
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Tweet Text */}
                <div className="text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed pt-1 whitespace-pre-wrap">
                  {renderFormattedCopy(cleanCopy)}
                </div>

                {/* Media */}
                {mediaUrl && !imgError && (
                  <div className="mt-2.5 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100 dark:bg-slate-900">
                    <img
                      src={mediaUrl}
                      alt={post.title || 'Post'}
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Tweet Stats */}
                <div className="flex items-center justify-between pt-3 text-slate-400 text-[11px]">
                  <div className="flex items-center gap-1.5 hover:text-sky-500 cursor-pointer transition">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>18</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-emerald-500 cursor-pointer transition">
                    <Repeat2 className="w-3.5 h-3.5" />
                    <span>42</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLiked(!liked)}
                    className={`flex items-center gap-1.5 hover:text-pink-500 cursor-pointer transition ${
                      liked ? 'text-pink-500' : ''
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                    <span>{liked ? '385' : '384'}</span>
                  </button>
                  <div className="flex items-center gap-1.5 hover:text-sky-500 cursor-pointer transition">
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

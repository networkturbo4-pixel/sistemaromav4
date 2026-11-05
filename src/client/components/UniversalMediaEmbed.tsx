import React, { useState } from 'react';
import { ExternalLink, Play, AlertCircle, FileVideo, Image as ImageIcon } from 'lucide-react';

interface UniversalMediaEmbedProps {
  url?: string;
  className?: string;
  alt?: string;
  autoplay?: boolean;
}

export const UniversalMediaEmbed: React.FC<UniversalMediaEmbedProps> = ({
  url,
  className = '',
  alt = 'Media preview',
  autoplay = false
}) => {
  const [loadError, setLoadError] = useState(false);

  if (!url) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/60 rounded-xl text-slate-400 p-8 ${className}`}>
        <ImageIcon className="w-12 h-12 stroke-1 mb-2 opacity-50" />
        <span className="text-xs">Sin recurso multimedia adjunto</span>
      </div>
    );
  }

  const trimmed = url.trim();

  // 1. Direct Image check (Data URLs, blob, common image extensions)
  const isDataUrl = trimmed.startsWith('data:image/');
  const isImageFile = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(trimmed);
  if (isDataUrl || isImageFile) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-slate-900/5 dark:bg-slate-950/40 rounded-xl ${className}`}>
        <img
          src={trimmed}
          alt={alt}
          onError={() => setLoadError(true)}
          className="max-w-full max-h-full object-contain rounded-lg transition-transform hover:scale-[1.01]"
        />
      </div>
    );
  }

  // 2. Direct Video File (.mp4, .webm, .mov)
  const isVideoFile = /\.(mp4|webm|mov|ogg)($|\?)/i.test(trimmed) || trimmed.includes('/stream');
  if (isVideoFile) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-black rounded-xl ${className}`}>
        <video
          src={trimmed}
          controls
          autoPlay={autoplay}
          playsInline
          className="max-w-full max-h-full rounded-lg"
          onError={() => setLoadError(true)}
        />
      </div>
    );
  }

  // 3. YouTube Embed
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return (
      <div className={`relative overflow-hidden aspect-video bg-black rounded-xl ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0 rounded-xl"
        />
      </div>
    );
  }

  // 4. TikTok Embed
  const tiktokMatch = trimmed.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/v2\/)(\d+)/);
  if (tiktokMatch && tiktokMatch[1]) {
    const videoId = tiktokMatch[1];
    return (
      <div className={`relative overflow-hidden aspect-[9/16] max-h-[640px] mx-auto bg-black rounded-2xl shadow-xl ${className}`}>
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          title="TikTok video"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0 rounded-2xl"
        />
      </div>
    );
  }

  // 5. Facebook Video Embed
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    const encoded = encodeURIComponent(trimmed);
    return (
      <div className={`relative overflow-hidden aspect-video bg-black rounded-xl ${className}`}>
        <iframe
          src={`https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&t=0`}
          title="Facebook video"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0 rounded-xl"
        />
      </div>
    );
  }

  // 6. Google Drive Video or File Preview
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return (
      <div className={`relative overflow-hidden aspect-video bg-slate-900 rounded-xl ${className}`}>
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          title="Google Drive Preview"
          allow="autoplay"
          allowFullScreen
          className="w-full h-full border-0 rounded-xl"
        />
      </div>
    );
  }

  // 7. Vimeo Embed
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return (
      <div className={`relative overflow-hidden aspect-video bg-black rounded-xl ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`}
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0 rounded-xl"
        />
      </div>
    );
  }

  // 8. Pinterest Embed
  if (trimmed.includes('pinterest.com') || trimmed.includes('pin.it')) {
    return (
      <div className={`relative flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ${className}`}>
        <span className="text-xs font-semibold text-red-600 mb-2">Tablero o Pin de Pinterest</span>
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Abrir referencia en Pinterest</span>
        </a>
      </div>
    );
  }

  // Fallback: If it's a generic URL, try rendering img or fallback card
  if (!loadError) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-slate-900/5 dark:bg-slate-950/40 rounded-xl ${className}`}>
        <img
          src={trimmed}
          alt={alt}
          onError={() => setLoadError(true)}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center ${className}`}>
      <FileVideo className="w-8 h-8 text-primary-500 mb-2" />
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Recurso externo vinculado</span>
      <p className="text-[11px] text-slate-400 break-all max-w-sm mb-3">{trimmed}</p>
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Abrir en nueva pestaña</span>
      </a>
    </div>
  );
};

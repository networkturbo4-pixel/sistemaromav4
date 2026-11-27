import React, { useState, useEffect } from 'react';
import { ExternalLink, FileVideo, Image as ImageIcon, Loader2 } from 'lucide-react';
import { SystemVideoPlayer } from './SystemVideoPlayer';

interface UniversalMediaEmbedProps {
  url?: string;
  fileName?: string;
  formatHint?: string;
  maxHeightPx?: number;
  className?: string;
  mediaClassName?: string;
  alt?: string;
  autoplay?: boolean;
  thumbnail?: boolean;
  seekToSeconds?: { time: number; nonce: number } | null;
  onTimestampComment?: (seconds: number, formatted: string) => void;
  onClick?: () => void;
}

interface DriveMediaMeta {
  id: string;
  name?: string;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  durationMillis?: number | null;
  thumbnailUrl?: string;
}

const driveMetaCache = new Map<string, DriveMediaMeta | null>();

export function extractDriveStreamId(url?: string): string | null {
  if (!url) return null;
  const match = url.trim().match(/\/api\/drive\/(?:stream\/|files\/)([^/?#]+)/i);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export function isLikelyVideoMedia(url?: string, fileName?: string, formatHint?: string): boolean {
  const trimmed = (url || '').trim();
  if (trimmed.startsWith('data:video/')) return true;
  if (/\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(trimmed)) return true;
  if (fileName && /\.(mp4|webm|mov|ogg|m4v)$/i.test(fileName)) return true;
  if (formatHint && /^(reel|video|short|story)$/i.test(formatHint) && extractDriveStreamId(trimmed)) {
    return true;
  }
  return false;
}

function getInitialMediaMode(url: string, fileName?: string): 'image' | 'video' | 'unknown' {
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return 'image';
  if (trimmed.startsWith('data:video/')) return 'video';
  if (/\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)($|\?)/i.test(trimmed)) return 'image';
  if (/\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(trimmed)) return 'video';

  if (fileName) {
    if (/\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)$/i.test(fileName)) return 'image';
    if (/\.(mp4|webm|mov|ogg|m4v)$/i.test(fileName)) return 'video';
  }

  return 'unknown';
}

export const UniversalMediaEmbed: React.FC<UniversalMediaEmbedProps> = ({
  url,
  fileName,
  formatHint,
  maxHeightPx = 540,
  className = '',
  mediaClassName = '',
  alt = 'Media preview',
  autoplay = false,
  thumbnail = false,
  seekToSeconds = null,
  onTimestampComment,
  onClick,
}) => {
  const trimmed = (url || '').trim();
  const driveId = extractDriveStreamId(trimmed);

  const [fallbackStep, setFallbackStep] = useState<'initial' | 'try_video' | 'error'>('initial');
  const [driveMeta, setDriveMeta] = useState<DriveMediaMeta | null>(() =>
    driveId && driveMetaCache.has(driveId) ? driveMetaCache.get(driveId) || null : null
  );
  const [metaLoading, setMetaLoading] = useState<boolean>(() =>
    Boolean(driveId && !driveMetaCache.has(driveId))
  );

  useEffect(() => {
    setFallbackStep('initial');
    if (!driveId) {
      setDriveMeta(null);
      setMetaLoading(false);
      return;
    }

    if (driveMetaCache.has(driveId)) {
      setDriveMeta(driveMetaCache.get(driveId) || null);
      setMetaLoading(false);
      return;
    }

    let cancelled = false;
    setMetaLoading(true);
    fetch(`/api/drive/meta/${encodeURIComponent(driveId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((meta: DriveMediaMeta | null) => {
        driveMetaCache.set(driveId, meta);
        if (!cancelled) {
          setDriveMeta(meta);
          setMetaLoading(false);
        }
      })
      .catch(() => {
        driveMetaCache.set(driveId, null);
        if (!cancelled) {
          setDriveMeta(null);
          setMetaLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trimmed, fileName, driveId]);

  if (!trimmed) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/60 rounded-xl text-slate-400 p-8 ${className}`}>
        <ImageIcon className="w-12 h-12 stroke-1 mb-2 opacity-50" />
        <span className="text-xs">Sin recurso multimedia adjunto</span>
      </div>
    );
  }

  const effectiveFileName = fileName || driveMeta?.name;
  let resolvedMode = getInitialMediaMode(trimmed, effectiveFileName);
  if (driveMeta?.mimeType) {
    if (driveMeta.mimeType.startsWith('video/')) resolvedMode = 'video';
    else if (driveMeta.mimeType.startsWith('image/')) resolvedMode = 'image';
  }

  // Mientras se consulta /api/drive/meta/:id (<2ms) para una URL sin extensión,
  // evitar montar <img> sobre un video de 50MB.
  if (driveId && metaLoading && resolvedMode === 'unknown') {
    const isVertical = formatHint === 'reel' || formatHint === 'story';
    return (
      <div
        style={{
          aspectRatio: isVertical ? '9 / 16' : '16 / 9',
          maxHeight: `${maxHeightPx}px`,
        }}
        className={`relative flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900/70 rounded-2xl mx-auto ${
          isVertical ? 'h-[420px] max-w-full' : 'w-full'
        } ${className}`}
      >
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  // 1. Explicit Image check
  if (resolvedMode === 'image' && fallbackStep !== 'error') {
    return (
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center overflow-hidden bg-slate-900/5 dark:bg-slate-950/40 rounded-xl ${
          onClick ? 'cursor-zoom-in' : ''
        } ${className}`}
      >
        <img
          src={trimmed}
          alt={alt}
          onError={() => setFallbackStep('error')}
          style={{ maxHeight: `${maxHeightPx}px` }}
          className={
            mediaClassName ||
            'max-w-full w-auto h-auto object-contain rounded-lg transition-transform duration-200 hover:scale-[1.01]'
          }
        />
      </div>
    );
  }

  // 2. Video (directo o streaming de Drive) -> Reproductor propio del sistema
  if (resolvedMode === 'video' && fallbackStep !== 'error') {
    const posterUrl = driveId
      ? driveMeta?.thumbnailUrl || `/api/drive/thumbnail/${encodeURIComponent(driveId)}?size=960`
      : undefined;
    const initialDurationSec = driveMeta?.durationMillis
      ? driveMeta.durationMillis / 1000
      : null;

    return (
      <div className="relative flex items-center justify-center w-full">
        <SystemVideoPlayer
          src={trimmed}
          poster={posterUrl}
          initialWidth={driveMeta?.width || null}
          initialHeight={driveMeta?.height || null}
          initialDuration={initialDurationSec}
          formatHint={formatHint}
          autoPlay={autoplay}
          muted={thumbnail}
          compact={thumbnail}
          maxHeightPx={maxHeightPx}
          seekToSeconds={seekToSeconds}
          onTimestampComment={onTimestampComment}
          onError={() => setFallbackStep('error')}
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

  // 8. Loom Embed
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i);
  if (loomMatch && loomMatch[1]) {
    return (
      <div className={`relative overflow-hidden aspect-video bg-black rounded-xl ${className}`}>
        <iframe
          src={`https://www.loom.com/embed/${loomMatch[1]}`}
          title="Loom video"
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-full border-0 rounded-xl"
        />
      </div>
    );
  }

  // 9. Pinterest Embed
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

  // 10. Extensionless external URL fallback: try image first, then SystemVideoPlayer
  if (fallbackStep === 'initial') {
    return (
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center overflow-hidden bg-slate-900/5 dark:bg-slate-950/40 rounded-xl ${
          onClick ? 'cursor-zoom-in' : ''
        } ${className}`}
      >
        <img
          src={trimmed}
          alt={alt}
          onError={() => setFallbackStep('try_video')}
          style={{ maxHeight: `${maxHeightPx}px` }}
          className={mediaClassName || 'max-w-full w-auto h-auto object-contain rounded-lg'}
        />
      </div>
    );
  }

  if (fallbackStep === 'try_video') {
    return (
      <div className="relative flex items-center justify-center w-full">
        <SystemVideoPlayer
          src={trimmed}
          formatHint={formatHint}
          autoPlay={autoplay}
          muted={thumbnail}
          compact={thumbnail}
          maxHeightPx={maxHeightPx}
          seekToSeconds={seekToSeconds}
          onTimestampComment={onTimestampComment}
          onError={() => setFallbackStep('error')}
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

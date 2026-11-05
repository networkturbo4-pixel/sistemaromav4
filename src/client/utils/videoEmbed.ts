/**
 * Helper para parsear y embeber videos de múltiples plataformas
 * (YouTube, Vimeo, Google Drive, Loom, URLs directas mp4 o iframe)
 */

export interface ParsedVideoInfo {
  platform: 'youtube' | 'vimeo' | 'drive' | 'loom' | 'direct' | 'iframe' | 'unknown';
  embedUrl: string;
  originalUrl: string;
  isValid: boolean;
}

export function parseVideoUrl(url: string | undefined | null): ParsedVideoInfo {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { platform: 'unknown', embedUrl: '', originalUrl: '', isValid: false };
  }

  const clean = url.trim();

  // 1. Detectar si el usuario pegó directamente un tag <iframe>
  if (clean.includes('<iframe') && clean.includes('src=')) {
    const srcMatch = clean.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return {
        platform: 'iframe',
        embedUrl: srcMatch[1],
        originalUrl: clean,
        isValid: true,
      };
    }
  }

  // 2. YouTube (youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..., youtube.com/embed/...)
  const ytMatch = clean.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
      originalUrl: clean,
      isValid: true,
    };
  }

  // 3. Vimeo (vimeo.com/... o player.vimeo.com/video/...)
  const vimeoMatch = clean.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`,
      originalUrl: clean,
      isValid: true,
    };
  }

  // 4. Google Drive (drive.google.com/file/d/.../view o /preview)
  const driveMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      platform: 'drive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: clean,
      isValid: true,
    };
  }

  // 5. Loom (loom.com/share/... o loom.com/embed/...)
  const loomMatch = clean.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i);
  if (loomMatch && loomMatch[1]) {
    const videoId = loomMatch[1];
    return {
      platform: 'loom',
      embedUrl: `https://www.loom.com/embed/${videoId}`,
      originalUrl: clean,
      isValid: true,
    };
  }

  // 6. Archivo directo (.mp4, .webm, .ogg)
  if (clean.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return {
      platform: 'direct',
      embedUrl: clean,
      originalUrl: clean,
      isValid: true,
    };
  }

  // 7. Si ya es una URL HTTPS válida de incrustación
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return {
      platform: 'unknown',
      embedUrl: clean,
      originalUrl: clean,
      isValid: true,
    };
  }

  return { platform: 'unknown', embedUrl: '', originalUrl: clean, isValid: false };
}

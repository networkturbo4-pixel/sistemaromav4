"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Helper to extract 11-char video ID
function extractVideoId(input) {
    if (!input)
        return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed))
        return trimmed;
    const match = trimmed.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
}
// Clean song title and artist
function cleanSongTitle(rawTitle, author) {
    if (!rawTitle)
        return { title: 'Canción Desconocida', artist: author || 'Artista Desconocido' };
    let title = rawTitle
        .replace(/\[(Official\s*Video|Music\s*Video|Video\s*Oficial|Audio\s*Oficial|Audio|HD|4K|HQ|Lyric\s*Video|Letra)\]/gi, '')
        .replace(/\((Official\s*Video|Music\s*Video|Video\s*Oficial|Audio\s*Oficial|Audio|HD|4K|HQ|Lyric\s*Video|Letra|En\s*Vivo|Live)\)/gi, '')
        .trim();
    let artist = (author && author !== 'YouTube' && author !== 'YouTube Music') ? author : '';
    const sep = title.includes(' - ') ? ' - ' : title.includes(' – ') ? ' – ' : null;
    if (sep) {
        const parts = title.split(sep);
        artist = parts[0].trim();
        title = parts.slice(1).join(sep).trim();
    }
    return {
        title: title || rawTitle,
        artist: artist || author || 'Artista Desconocido',
    };
}
// Parse duration "3:45" or "1:02:15" to seconds
function parseDuration(durationStr) {
    if (!durationStr)
        return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.some(isNaN))
        return 0;
    if (parts.length === 2)
        return parts[0] * 60 + parts[1];
    if (parts.length === 3)
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}
// GET /api/music/suggestions?q=...
router.get('/suggestions', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ suggestions: [] });
        }
        const url = `https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&q=${encodeURIComponent(q)}`;
        const response = await fetch(url);
        if (!response.ok) {
            return res.json({ suggestions: [] });
        }
        const data = await response.json();
        const suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
        return res.json({ suggestions });
    }
    catch (error) {
        return res.json({ suggestions: [] });
    }
});
// GET /api/music/search?q=...
router.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) {
            return res.json({ results: [] });
        }
        // Direct video link or ID
        const directId = extractVideoId(q);
        if (directId) {
            try {
                const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${directId}`)}`);
                if (noembedRes.ok) {
                    const info = await noembedRes.json();
                    const { title, artist } = cleanSongTitle(info.title || '', info.author_name);
                    return res.json({
                        results: [
                            {
                                id: directId,
                                videoId: directId,
                                title,
                                artist,
                                thumbnailUrl: info.thumbnail_url || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
                                duration: 0,
                                addedAt: Date.now(),
                            },
                        ],
                    });
                }
            }
            catch { }
        }
        // YouTube Innertube search
        const ytRes = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20250101.00.00',
                        hl: 'es',
                        gl: 'US',
                    },
                },
                query: q,
            }),
        });
        if (!ytRes.ok) {
            return res.json({ results: [] });
        }
        const data = await ytRes.json();
        const results = [];
        // Parse contents from Innertube response
        const primaryContents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents || [];
        for (const section of primaryContents) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const vr = item.videoRenderer;
                if (!vr || !vr.videoId)
                    continue;
                const videoId = vr.videoId;
                const rawTitle = vr.title?.runs?.[0]?.text || vr.title?.accessibility?.accessibilityData?.label || '';
                const author = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
                const durationText = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || '';
                const durationSec = parseDuration(durationText);
                const thumbs = vr.thumbnail?.thumbnails || [];
                const thumbUrl = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                const { title, artist } = cleanSongTitle(rawTitle, author);
                results.push({
                    id: videoId,
                    videoId,
                    title,
                    artist,
                    thumbnailUrl: thumbUrl,
                    duration: durationSec,
                    addedAt: Date.now(),
                });
                if (results.length >= 25)
                    break;
            }
            if (results.length >= 25)
                break;
        }
        return res.json({ results });
    }
    catch (error) {
        console.error('Error in /api/music/search:', error);
        return res.status(500).json({ error: 'Error al buscar en YouTube' });
    }
});
// GET /api/music/metadata?id=...
router.get('/metadata', async (req, res) => {
    try {
        const raw = String(req.query.id || req.query.url || '').trim();
        const videoId = extractVideoId(raw);
        if (!videoId) {
            return res.status(400).json({ error: 'ID o URL de video no válido' });
        }
        const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`);
        if (noembedRes.ok) {
            const info = await noembedRes.json();
            const { title, artist } = cleanSongTitle(info.title || '', info.author_name);
            return res.json({
                id: videoId,
                videoId,
                title,
                artist,
                thumbnailUrl: info.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: 0,
                addedAt: Date.now(),
            });
        }
        return res.json({
            id: videoId,
            videoId,
            title: `Canción (${videoId})`,
            artist: 'YouTube',
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 0,
            addedAt: Date.now(),
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener metadatos' });
    }
});
exports.default = router;

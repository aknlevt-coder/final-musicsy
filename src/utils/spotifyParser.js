export const parseSpotifyHtml = (htmlContent, url) => {
  let targetTrackId = null;
  if (url.includes('/track/')) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const trackIdx = pathParts.indexOf('track');
      if (trackIdx !== -1 && pathParts.length > trackIdx + 1) {
        targetTrackId = pathParts[trackIdx + 1];
      }
    } catch(e) {}
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const scriptNodes = doc.querySelectorAll('script');
  let stateJson = null;

  for (let script of scriptNodes) {
    try {
      const content = script.innerHTML.trim();
      if (content.startsWith('ey')) {
        const binaryStr = atob(content);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const decoded = new TextDecoder('utf-8').decode(bytes);
        if (decoded.includes('spotify:track:')) {
          stateJson = JSON.parse(decoded);
          break;
        }
      }
    } catch (e) {
      // sessizce geç
    }
  }

  const foundTracks = [];

  if (stateJson) {
    const findTracks = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.type === 'track' || (obj.uri && obj.uri.startsWith('spotify:track:'))) {
        if (obj.name) {
          let artist = 'Bilinmeyen Sanatçı';

          if (obj.artists) {
            if (Array.isArray(obj.artists)) {
              artist = obj.artists.map(a => a.name).filter(Boolean).join(', ');
            } else if (obj.artists.items) {
              artist = obj.artists.items.map(a => a.profile?.name || a.name).filter(Boolean).join(', ');
            }
          } else if (obj.firstArtist) {
            if (typeof obj.firstArtist === 'string') {
              artist = obj.firstArtist;
            } else if (obj.firstArtist.items && Array.isArray(obj.firstArtist.items)) {
              artist = obj.firstArtist.items.map(a => a.name || '').filter(Boolean).join(', ');
            }
          }

          if (typeof artist !== 'string') {
             artist = "Bilinmeyen Sanatçı";
          }

          if (!foundTracks.some(t => t.name === obj.name && t.artist === artist)) {
            const trackId = obj.id || (obj.uri ? obj.uri.split(':').pop() : null);
            foundTracks.push({
              id: trackId || ('spotify-' + Date.now() + '-' + Math.random()),
              name: obj.name,
              artist: artist || 'Bilinmeyen Sanatçı',
              duration_ms: obj.duration?.totalMilliseconds || obj.duration_ms || 0,
              video_url: '',
              status: 'idle',
              query: `${artist} - ${obj.name}`
            });
          }
        }
      }

      if (Array.isArray(obj)) {
        obj.forEach(findTracks);
      } else {
        Object.values(obj).forEach(findTracks);
      }
    };

    findTracks(stateJson);

    if (foundTracks.length === 0) {
      throw new Error('Çalma listesinde şarkı bulunamadı veya biçim desteklenmiyor.');
    }
  } else {
    const titleMeta = doc.querySelector('meta[property="og:title"]');
    const descMeta = doc.querySelector('meta[property="og:description"]');

    if (titleMeta && !url.includes('playlist')) {
      const title = titleMeta.content;
      let artist = 'Bilinmeyen Sanatçı';
      if (descMeta) {
        const parts = descMeta.content.split('·');
        if (parts.length > 0) artist = parts[0].trim();
      }
      foundTracks.push({
        id: 'spotify-' + Date.now(),
        name: title,
        artist: artist,
        duration_ms: 0,
        video_url: '',
        status: 'idle',
        query: `${artist} - ${title}`
      });
    } else {
      throw new Error('Spotify verisi çözülemedi. Lütfen geçerli bir Spotify linki girdiğinizden emin olun.');
    }
  }

  // Odaklanma (Focus) Filtresi
  if (targetTrackId && foundTracks.length > 0) {
    const focusedTrack = foundTracks.find(t => t.id === targetTrackId);
    if (focusedTrack) {
      return [focusedTrack]; // Sadece hedeflenen şarkıyı döndür
    }
  }

  return foundTracks;
};

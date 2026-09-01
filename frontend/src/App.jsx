import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './index.css';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';

// Hooks & Utils
import { useDownloader } from './hooks/useDownloader';
import { parseSpotifyHtml } from './utils/spotifyParser';

function AppContent() {
  const [url, setUrl] = useState('');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // useDownloader Hook'u
  const {
    isDownloadingAll,
    downloadProgress,
    isPackageReady,
    isSaving,
    handleDownload,
    handleDownloadAll,
    handleSavePackage,
    clearDownloads
  } = useDownloader(tracks, setTracks);

  // 1. LİNKİ AYRIŞTIRMA (Parse)
  const handleFetch = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    clearDownloads();

    try {
      let newTracks = [];

      if (url.includes('spotify.com')) {
        const htmlContent = await invoke('fetch_html', { url: url });
        if (htmlContent) {
          newTracks = parseSpotifyHtml(htmlContent, url);
        } else {
          throw new Error("Spotify'a erişilemedi. Proxy hatası.");
        }
      } else {
        const response = await invoke('parse_youtube', { url: url });
        if (response.tracks && response.tracks.length > 0) {
          newTracks = response.tracks.map(t => ({ 
            ...t, 
            status: 'idle',
            query: `${t.artist} - ${t.name}` 
          }));
        }
      }

      setTracks(prev => [...prev, ...newTracks]);
      setUrl(''); 
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || 'Bağlantı veya ayrıştırma hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = useCallback(() => {
    setTracks([]);
    setUrl('');
    clearDownloads();
    setError(null);
  }, [clearDownloads]);

  return (
    <div className="container">
      <div className="glass-panel">
        <Header />

        <SearchBar 
          url={url} 
          setUrl={setUrl} 
          onFetch={handleFetch} 
          onClear={handleClear} 
          loading={loading} 
          hasTracks={tracks.length > 0} 
        />

        {error && <div style={{color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center'}}>{error}</div>}

        {tracks.length > 0 && (
          <TrackList 
            tracks={tracks}
            isPackageReady={isPackageReady}
            isSaving={isSaving}
            isDownloadingAll={isDownloadingAll}
            downloadProgress={downloadProgress}
            onDownload={handleDownload}
            onDownloadAll={handleDownloadAll}
            onSavePackage={handleSavePackage}
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
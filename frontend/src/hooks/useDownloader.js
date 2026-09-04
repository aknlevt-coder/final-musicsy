import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const useDownloader = (tracks, setTracks) => {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isPackageReady, setIsPackageReady] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    invoke('update_yt_dlp')
      .then(res => console.log('yt-dlp güncellendi:', res))
      .catch(err => console.error('yt-dlp güncellenirken hata:', err));

    let unlisten;
    const setupListener = async () => {
      unlisten = await listen('download-progress', (event) => {
        const { index, progress } = event.payload;
        setTracks(prev => {
          const newTracks = [...prev];
          if (newTracks[index]) {
            newTracks[index].downloadPercent = progress;
          }
          return newTracks;
        });
      });
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [setTracks]);

  const handleDownload = async (trackIndex, isBatch = false) => {
    const track = tracks[trackIndex];

    setTracks(prev => {
      const newTracks = [...prev];
      newTracks[trackIndex].status = 'searching';
      return newTracks;
    });

    try {
      let videoUrl = track.video_url;
      let title = track.name;

      if (!videoUrl) {
        const searchRes = await invoke('search_youtube', { query: track.query });
        videoUrl = searchRes.video_url;
        title = searchRes.name;
      }

      setTracks(prev => {
        const newTracks = [...prev];
        newTracks[trackIndex].status = 'downloading';
        return newTracks;
      });

      const safeFilename = `${title} - ${track.artist}`.replace(/[\/\\?%*:|"<>]/g, '-');

      const downloadedFilePath = await invoke('download_mp3', {
        url: videoUrl,
        title: safeFilename,
        index: trackIndex
      });

      setTracks(prev => {
        const newTracks = [...prev];
        newTracks[trackIndex].status = 'complete';
        return newTracks;
      });

      if (!isBatch) {
        const targetDir = localStorage.getItem('musicsy_download_path');
        await invoke('create_zip_and_save', { 
            filePaths: [downloadedFilePath],
            targetDir: targetDir || null
        });
      }

      return downloadedFilePath;
    } catch (err) {
      console.error('İndirme hatası:', err);
      setTracks(prev => {
        const newTracks = [...prev];
        newTracks[trackIndex].status = 'error';
        newTracks[trackIndex].errorMessage = typeof err === 'string' ? err : (err.message || 'Bilinmeyen hata');
        return newTracks;
      });
      return null;
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    setIsPackageReady(false);
    setDownloadedFiles([]);

    const pendingIndexes = [];
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].status === 'idle' || tracks[i].status === 'error') {
        pendingIndexes.push(i);
      }
    }

    if (pendingIndexes.length === 0) {
      setIsDownloadingAll(false);
      return;
    }

    const MAX_CONCURRENT = 10;
    setDownloadProgress({ current: 0, total: pendingIndexes.length });
    let completedCount = 0;
    let paths = [];

    for (let i = 0; i < pendingIndexes.length; i += MAX_CONCURRENT) {
      const chunk = pendingIndexes.slice(i, i + MAX_CONCURRENT);

      await Promise.all(
        chunk.map(async (idx) => {
          const path = await handleDownload(idx, true);
          if (path) paths.push(path);
          completedCount++;
          setDownloadProgress(prev => ({ ...prev, current: completedCount }));
        })
      );

      if (i + MAX_CONCURRENT < pendingIndexes.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (paths.length > 0) {
      setDownloadedFiles(paths);
      setIsPackageReady(true);
    }

    setIsDownloadingAll(false);
    setDownloadProgress(null);
  };

  const handleSavePackage = async () => {
    setIsSaving(true);
    try {
      const targetDir = localStorage.getItem('musicsy_download_path');
      const result = await invoke('create_zip_and_save', { 
          filePaths: downloadedFiles,
          targetDir: targetDir || null
      });
      alert(result);
      setIsPackageReady(false);
      setDownloadedFiles([]);
    } catch (err) {
      console.error('Paketleme hatası:', err);
      alert('Paketleme sırasında bir hata oluştu: ' + err);
    } finally {
      setIsSaving(false);
    }
  };

  const clearDownloads = () => {
    setDownloadProgress(null);
    setIsPackageReady(false);
    setDownloadedFiles([]);
  };

  return {
    isDownloadingAll,
    downloadProgress,
    isPackageReady,
    isSaving,
    handleDownload,
    handleDownloadAll,
    handleSavePackage,
    clearDownloads
  };
};

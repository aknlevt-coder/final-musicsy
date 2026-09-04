import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

const Header = () => {
  const [downloadPath, setDownloadPath] = useState('Varsayılan (İndirilenler)');

  useEffect(() => {
    const savedPath = localStorage.getItem('musicsy_download_path');
    if (savedPath) {
      setDownloadPath(savedPath);
    }
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'İndirme Klasörünü Seçin'
      });
      
      if (selected) {
        localStorage.setItem('musicsy_download_path', selected);
        setDownloadPath(selected);
      }
    } catch (err) {
      console.error('Klasör seçilirken hata:', err);
    }
  };

  return (
    <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h1>Spotify & YouTube to MP3</h1>
        <p>Çalma listesi veya şarkı linkini yapıştırın, anında indirin.</p>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '14px' }}>[GÜNCEL]</span>
        <button 
          onClick={handleSelectFolder} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            border: '1px solid rgba(255, 255, 255, 0.2)', 
            color: 'white', 
            padding: '8px 12px', 
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
          ⚙️ Konum: {downloadPath.length > 20 ? '...' + downloadPath.slice(-20) : downloadPath}
        </button>
      </div>
    </div>
  );
};

export default Header;

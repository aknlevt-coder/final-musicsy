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
      <div style={{ textAlign: 'right' }}>
        <button 
          onClick={handleSelectFolder} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            border: '1px solid rgba(255, 255, 255, 0.2)', 
            color: 'white', 
            padding: '8px 16px', 
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(5px)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <span style={{ fontSize: '15px' }}>⚙️</span> 
          <span>Konum: {downloadPath.length > 25 ? '...' + downloadPath.slice(-25) : downloadPath}</span>
        </button>
      </div>
    </div>
  );
};

export default Header;

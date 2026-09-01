import React from 'react';

const TrackItem = ({ track, idx, onDownload }) => {
  return (
    <div className="track-item">
      <div className="track-info">
        <div className="track-name">{track.name}</div>
        <div className="track-artist">{track.artist}</div>
      </div>
      <div className="track-actions">
        {track.status === 'idle' && (
          <button className="btn-download" onClick={() => onDownload(idx, false)}>
            MP3 İndir
          </button>
        )}
        {track.status === 'searching' && <span className="status-text">YouTube'da aranıyor...</span>}
        {track.status === 'downloading' && (
          <span className="status-text">
            İndiriliyor: {track.downloadPercent ? `%${track.downloadPercent}` : 'başlıyor...'}
          </span>
        )}
        {track.status === 'complete' && <span className="status-text" style={{color: '#fff'}}>✓ İndirildi</span>}
        {track.status === 'error' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end'}}>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <span className="status-text status-error">Hata oluştu</span>
              <button className="btn-download" onClick={() => onDownload(idx, false)}>
                Tekrar Dene
              </button>
            </div>
            {track.errorMessage && (
              <span style={{fontSize: '0.75rem', color: 'var(--danger)', maxWidth: '250px', textAlign: 'right'}}>
                {track.errorMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TrackItem);

import React from 'react';
import TrackItem from './TrackItem';

const TrackList = ({ 
  tracks, 
  isPackageReady, 
  isSaving, 
  isDownloadingAll, 
  downloadProgress, 
  onDownload, 
  onDownloadAll, 
  onSavePackage 
}) => {
  return (
    <div className="track-list-container">
      <div className="list-header">
        <h3>Bulunan Şarkılar ({tracks.length})</h3>
        
        <div className="action-buttons">
          {isPackageReady ? (
            <button 
              className="btn" 
              onClick={onSavePackage}
              disabled={isSaving}
              style={{backgroundColor: '#28a745', color: 'white', fontWeight: 'bold'}}
            >
              {isSaving ? (
                <>
                  <div className="spinner"></div> İşleniyor...
                </>
              ) : 'Paket Hazır, İndir (Klasöre Kaydet)'}
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={onDownloadAll}
              disabled={isDownloadingAll || tracks.every(t => t.status === 'complete')}
            >
              {isDownloadingAll ? (
                <>
                  <div className="spinner"></div> 
                  {`İndiriliyor (${downloadProgress?.current || 0}/${downloadProgress?.total || 0})`}
                </>
              ) : 'Tümünü İndir'}
            </button>
          )}
        </div>
      </div>
      <div className="track-list">
        {tracks.map((track, idx) => (
          <TrackItem 
            key={track.id || idx} 
            track={track} 
            idx={idx} 
            onDownload={onDownload} 
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(TrackList);

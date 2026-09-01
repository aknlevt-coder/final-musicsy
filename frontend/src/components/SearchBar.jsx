import React from 'react';

const SearchBar = ({ url, setUrl, onFetch, onClear, loading, hasTracks }) => {
  return (
    <div className="input-group">
      <input 
        type="text" 
        className="input-field" 
        placeholder="https://open.spotify.com/playlist/... veya youtube.com/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button 
        className="btn" 
        onClick={onFetch}
        disabled={loading || !url}
      >
        {loading ? <div className="spinner"></div> : 'Bul'}
      </button>
      {hasTracks && (
        <button 
          className="btn" 
          onClick={onClear} 
          style={{background: 'rgba(255,255,255,0.1)', color: '#fff'}}
        >
          Temizle
        </button>
      )}
    </div>
  );
};

export default SearchBar;

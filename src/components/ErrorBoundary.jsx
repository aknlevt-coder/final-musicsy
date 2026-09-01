import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Arayüz Çöktü:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}>
          <h2>Üzgünüz, bir şeyler ters gitti.</h2>
          <p>Lütfen sayfayı yenileyin veya uygulamayı yeniden başlatın.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', color: '#a3a3a3' }}>
            {this.state.error && this.state.error.toString()}
          </details>
          <button 
            className="btn" 
            style={{marginTop: '1rem', padding: '0.5rem 1rem', background: '#333', color: 'white'}}
            onClick={() => window.location.reload()}
          >
            Yenile
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;

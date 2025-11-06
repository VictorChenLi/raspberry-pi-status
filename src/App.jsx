import { useState, useEffect } from 'react'
import RaspberryPiInfo from './components/RaspberryPiInfo'
import Camera from './components/Camera'
import SystemControl from './components/SystemControl'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [hostname, setHostname] = useState('Raspberry Pi')

  useEffect(() => {
    // Fetch hostname from backend
    const fetchHostname = async () => {
      try {
        const response = await fetch('/api/system-info');
        const data = await response.json();
        if (data.hostname) {
          setHostname(data.hostname);
          // Update document title
          document.title = `${data.hostname} Dashboard`;
        }
      } catch (error) {
        console.error('Error fetching hostname:', error);
      }
    };

    fetchHostname();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🥧 {hostname} Dashboard</h1>
          <p>Monitor your {hostname} and control the camera</p>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 System Info
        </button>
        <button
          className={`nav-btn ${activeTab === 'camera' ? 'active' : ''}`}
          onClick={() => setActiveTab('camera')}
        >
          📷 Camera
        </button>
        <button
          className={`nav-btn ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          ⚙️ Sys Control
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && <RaspberryPiInfo hostname={hostname} />}
        {activeTab === 'camera' && <Camera hostname={hostname} />}
        {activeTab === 'control' && <SystemControl hostname={hostname} />}
      </main>

      <footer className="app-footer">
        <p>{hostname} Web Dashboard - Built with React & Vite</p>
      </footer>
    </div>
  )
}

export default App

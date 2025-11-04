import { useState } from 'react'
import RaspberryPiInfo from './components/RaspberryPiInfo'
import Camera from './components/Camera'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🥧 Raspberry Pi Dashboard</h1>
          <p>Monitor your Raspberry Pi and control the camera</p>
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
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && <RaspberryPiInfo />}
        {activeTab === 'camera' && <Camera />}
      </main>

      <footer className="app-footer">
        <p>Raspberry Pi Web Dashboard - Built with React & Vite</p>
      </footer>
    </div>
  )
}

export default App

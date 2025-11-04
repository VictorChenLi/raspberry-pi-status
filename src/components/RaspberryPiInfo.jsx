import { useState, useEffect } from 'react';
import './RaspberryPiInfo.css';

function RaspberryPiInfo() {
  const [systemInfo, setSystemInfo] = useState({
    cpuTemp: 'Loading...',
    cpuUsage: 'Loading...',
    memoryUsage: 'Loading...',
    diskSpace: 'Loading...',
    uptime: 'Loading...',
    hostname: 'Loading...',
    osVersion: 'Loading...',
  });

  useEffect(() => {
    // Fetch system information
    fetchSystemInfo();

    // Update every 5 seconds
    const interval = setInterval(fetchSystemInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('http://victorpi3.local:3001/api/system-info');
      const data = await response.json();
      setSystemInfo(data);
    } catch (error) {
      console.error('Error fetching system info:', error);
      setSystemInfo({
        cpuTemp: 'Error',
        cpuUsage: 'Error',
        memoryUsage: 'Error',
        diskSpace: 'Error',
        uptime: 'Error',
        hostname: 'Error',
        osVersion: 'Could not connect to backend',
      });
    }
  };

  return (
    <div className="rpi-info-container">
      <h2>Raspberry Pi System Information</h2>
      <div className="info-grid">
        <div className="info-card">
          <div className="info-icon">🌡️</div>
          <div className="info-content">
            <div className="info-label">CPU Temperature</div>
            <div className="info-value">{systemInfo.cpuTemp}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">⚡</div>
          <div className="info-content">
            <div className="info-label">CPU Usage</div>
            <div className="info-value">{systemInfo.cpuUsage}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">💾</div>
          <div className="info-content">
            <div className="info-label">Memory Usage</div>
            <div className="info-value">{systemInfo.memoryUsage}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">💿</div>
          <div className="info-content">
            <div className="info-label">Disk Space</div>
            <div className="info-value">{systemInfo.diskSpace}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">⏱️</div>
          <div className="info-content">
            <div className="info-label">Uptime</div>
            <div className="info-value">{systemInfo.uptime}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">🖥️</div>
          <div className="info-content">
            <div className="info-label">Hostname</div>
            <div className="info-value">{systemInfo.hostname}</div>
          </div>
        </div>

        <div className="info-card full-width">
          <div className="info-icon">🐧</div>
          <div className="info-content">
            <div className="info-label">OS Version</div>
            <div className="info-value">{systemInfo.osVersion}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RaspberryPiInfo;

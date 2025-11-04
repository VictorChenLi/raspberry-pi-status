# Raspberry Pi Status Monitor

A real-time web application for monitoring Raspberry Pi system status and camera feed. This application provides live updates of CPU usage, memory usage, disk usage, system temperature, and a live camera stream.

## Features

- **Real-time System Monitoring**
  - CPU usage percentage
  - Memory usage (used/total)
  - Disk usage (used/total/available)
  - System temperature monitoring
  - Real-time updates every 2 seconds

- **Live Camera Feed**
  - MJPEG stream from Raspberry Pi camera
  - Displays camera device information
  - Automatic reconnection on stream failure

- **Modern UI**
  - Responsive design
  - Clean and intuitive interface
  - Real-time data visualization

## Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **systeminformation** - System metrics collection

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- npm (v6 or higher)
- Raspberry Pi with camera module enabled
- `rpicam-vid` (for camera streaming on newer Raspberry Pi OS)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/VictorChenLi/raspberry-pi-status.git
cd raspberry-pi-status
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Camera Setup

Make sure your Raspberry Pi camera is enabled:
```bash
sudo raspi-config
# Navigate to Interface Options > Camera > Enable
```

### Server Configuration

The server runs on port `3001` by default. To change this, modify `server/index.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### Development Server Configuration

The Vite dev server runs on port `5173` and proxies API requests to the backend. Configuration is in `vite.config.js`.

## Running the Application

### Development Mode

1. Start the backend server:
```bash
node server/index.js
```

2. In a new terminal, start the frontend development server:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:5173
```

### Production Build

1. Build the frontend:
```bash
npm run build
```

2. The built files will be in the `dist` directory. You can serve them using any static file server or integrate with the Express backend.

## Project Structure

```
raspberry-pi-status/
├── server/
│   └── index.js              # Express backend server
├── src/
│   ├── components/
│   │   ├── Camera.jsx        # Camera feed component
│   │   ├── Camera.css        # Camera component styles
│   │   ├── RaspberryPiInfo.jsx  # System info component
│   │   └── RaspberryPiInfo.css  # System info styles
│   ├── App.jsx               # Main application component
│   ├── App.css               # Application styles
│   ├── main.jsx              # Application entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html                # HTML template
├── package.json              # Project dependencies
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

## API Endpoints

### GET `/api/info`

Returns real-time system information.

**Response:**
```json
{
  "cpu": {
    "usage": 25.5
  },
  "memory": {
    "used": 1234567890,
    "total": 4294967296
  },
  "disk": {
    "used": 12345678900,
    "available": 23456789000,
    "total": 35802467900
  },
  "temperature": {
    "main": 45.2
  }
}
```

### GET `/api/camera`

Returns MJPEG stream from the Raspberry Pi camera.

**Response:** `multipart/x-mixed-replace` stream with JPEG frames

## Troubleshooting

### Camera Not Working

1. Ensure the camera is enabled in `raspi-config`
2. Check if `rpicam-vid` is installed:
```bash
which rpicam-vid
```
3. Test camera manually:
```bash
rpicam-vid -t 0 --inline -o - | ffmpeg -f h264 -i - -f mjpeg -
```

### High CPU Usage

The camera streaming can be CPU-intensive. To reduce CPU usage:
- Lower the camera resolution in `server/index.js`
- Increase the update interval for system info
- Use hardware acceleration if available

### Port Already in Use

If port 3001 or 5173 is already in use, you can:
1. Change the port in the respective configuration files
2. Kill the process using the port:
```bash
lsof -ti:3001 | xargs kill -9
```

## Future Improvements

- [ ] Add historical data charts
- [ ] Implement user authentication
- [ ] Add system controls (restart, shutdown)
- [ ] Support for multiple cameras
- [ ] Docker containerization
- [ ] Mobile app version
- [ ] Temperature alerts and notifications
- [ ] Network traffic monitoring
- [ ] Process monitoring

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Victor Chen (shenli570@gmail.com)

---

Built with React, Node.js, and Express for Raspberry Pi monitoring.

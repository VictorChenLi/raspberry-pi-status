# Raspberry Pi Status Monitor

A real-time web application for monitoring Raspberry Pi system status and camera feed. This application provides live updates of CPU usage, memory usage, disk usage, system temperature, and a live camera stream.

## Features

- **Real-time System Monitoring**
  - CPU usage percentage and temperature
  - Memory usage (used/total)
  - Disk usage (used/total/available)
  - System uptime
  - **Voltage monitoring** with automatic Pi model detection
    - Supports Raspberry Pi 3, 4, and 5
    - Model-specific voltage thresholds (Pi 5: 0.80V, Pi 3/4: 1.15V)
    - Under-voltage detection and warnings
    - Throttling status monitoring
  - Real-time updates every 2 seconds

- **System Control**
  - **Scheduled shutdowns** with cron-based scheduling
    - Set multiple shutdown schedules
    - Configure specific times and days of the week
    - Enable/disable schedules
  - **Immediate system controls**
    - Shutdown system remotely
    - Reboot system remotely

- **Camera Features**
  - **Automatic camera detection**
    - Supports both CSI (ribbon cable) cameras
    - Supports USB webcams
    - Auto-detects camera type on startup
  - **Live camera stream** (MJPEG)
  - **Photo capture** with timestamp
  - **Image gallery** with deletion capability
  - Displays camera device information

- **Modern UI**
  - Responsive design
  - Clean and intuitive interface
  - Real-time data visualization
  - Visual alerts for system issues

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

### System Control Permissions

For shutdown and reboot features to work, the application needs sudo permissions without password prompt. Add the following to your sudoers file:

```bash
sudo visudo
```

Add this line at the end (replace `pi` with your username):
```
pi ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot
```

Or for all users in the sudo group:
```
%sudo ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot
```

### Camera Setup

The application automatically detects both CSI (ribbon cable) and USB cameras. For CSI cameras, ensure it's enabled:
```bash
sudo raspi-config
# Navigate to Interface Options > Camera > Enable
```

Supported camera commands:
- `rpicam-still` (Raspberry Pi OS Bullseye and later)
- `libcamera-still` (older alternative)
- `ffmpeg` (for USB webcams)

### Server Configuration

The server runs on port `3001` by default. To change this, modify `server/index.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### Development Server Configuration

The Vite dev server runs on port `5173` and proxies API requests to the backend. Configuration is in `vite.config.js`.

### Voltage Monitoring

Voltage monitoring automatically detects your Pi model and uses the appropriate method:

**Raspberry Pi 5:**
- Monitors **power supply voltage** (what comes from your adapter)
- Uses PMIC (Power Management IC) via `vcgencmd pmic_read_adc`
- Shows the actual 5V rail (e.g., "5.06V")
- Warning threshold: 4.75V - 5.25V (5V ± 5% spec)
- This tells you if your power adapter is adequate

**Raspberry Pi 3/4:**
- Monitors **core voltage** (CPU internal voltage)
- Uses traditional `vcgencmd measure_volts core`
- Shows core voltage (typically ~1.2V)
- Warning threshold: < 1.15V

The system also monitors for under-voltage conditions and throttling using `vcgencmd get_throttled`.

**Why different voltages?**
Your Pi's power supply provides 5V, but modern CPUs don't run at 5V. The Pi has internal voltage regulators that convert 5V to lower voltages (3.3V, 1.8V, 0.87V) for different components. The Pi 5's PMIC allows us to monitor the actual power supply voltage, which is more useful for detecting power issues.

## Running the Application

### Quick Start (Recommended)

The easiest way to run both servers is using the included start script:

**Foreground mode** (shows logs in terminal):
```bash
./start.sh
# or
./start.sh --foreground
```

**Background mode** (runs as daemon):
```bash
./start.sh --background
```

**Check status:**
```bash
./start.sh --status
```

**Stop servers:**
```bash
./start.sh --stop
```

The application will be available at:
- **Frontend**: https://localhost:5173/
- **Backend API**: http://localhost:3001

### Manual Start

If you prefer to run the servers manually:

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
https://localhost:5173
```

### Systemd Service (Auto-start on boot)

A systemd service file is included for automatic startup:

1. Copy the service file to systemd directory:
```bash
mkdir -p ~/.config/systemd/user
cp raspberry-pi-status.service ~/.config/systemd/user/
```

2. Edit the service file to update paths if needed:
```bash
nano ~/.config/systemd/user/raspberry-pi-status.service
```

3. Enable and start the service:
```bash
systemctl --user enable raspberry-pi-status.service
systemctl --user start raspberry-pi-status.service
```

4. Check service status:
```bash
systemctl --user status raspberry-pi-status.service
```

### Production Build

1. Build the frontend:
```bash
npm run build
```

2. The built files will be in the `dist` directory and are automatically served by the Express backend at `http://localhost:3001`.

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

### System Information

#### GET `/api/system-info`

Returns comprehensive real-time system information including voltage monitoring.

**Response:**
```json
{
  "cpuTemp": "57.1'C",
  "cpuUsage": "25.0%",
  "memoryUsage": "26.2%",
  "diskSpace": "32% used",
  "uptime": "20h 13m",
  "hostname": "victorpi5",
  "osVersion": "Raspberry Pi OS",
  "piModel": "Raspberry Pi 5 Model B Rev 1.1",
  "voltage": "0.8713V",
  "voltageIssue": false,
  "voltageWarning": null
}
```

### Camera Endpoints

#### GET `/api/camera/info`

Returns camera detection information.

**Response:**
```json
{
  "type": "usb",
  "device": "/dev/video0",
  "available": true,
  "details": "..."
}
```

#### POST `/api/camera/photo`

Captures a photo from the camera.

**Response:**
```json
{
  "success": true,
  "filename": "photo_1234567890.jpg",
  "url": "/images/photo_1234567890.jpg",
  "timestamp": 1234567890
}
```

#### GET `/api/camera/stream`

Returns MJPEG stream from the Raspberry Pi camera.

**Response:** `multipart/x-mixed-replace` stream with JPEG frames

#### GET `/api/camera/images`

Lists all captured images.

**Response:**
```json
{
  "images": [
    {
      "filename": "photo_1234567890.jpg",
      "url": "/images/photo_1234567890.jpg",
      "timestamp": 1234567890
    }
  ]
}
```

#### DELETE `/api/camera/images/:filename`

Deletes a captured image.

### System Control Endpoints

#### GET `/api/system/schedules`

Returns all shutdown schedules.

**Response:**
```json
{
  "schedules": [
    {
      "id": "1234567890",
      "time": "23:00",
      "days": [0, 1, 2, 3, 4],
      "enabled": true,
      "created": "2024-11-07T12:00:00.000Z"
    }
  ]
}
```

#### POST `/api/system/schedules`

Creates a new shutdown schedule.

**Request Body:**
```json
{
  "time": "23:00",
  "days": [0, 1, 2, 3, 4],
  "enabled": true
}
```

#### PATCH `/api/system/schedules/:id`

Enables or disables a schedule.

**Request Body:**
```json
{
  "enabled": true
}
```

#### DELETE `/api/system/schedules/:id`

Deletes a shutdown schedule.

#### POST `/api/system/shutdown`

Initiates immediate system shutdown.

**Response:**
```json
{
  "success": true,
  "message": "System is shutting down..."
}
```

#### POST `/api/system/reboot`

Initiates immediate system reboot.

**Response:**
```json
{
  "success": true,
  "message": "System is rebooting..."
}
```

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

- [ ] Add historical data charts and graphs
- [ ] Implement user authentication and access control
- [x] ~~Add system controls (restart, shutdown)~~ ✓ Completed
- [x] ~~Scheduled shutdown functionality~~ ✓ Completed
- [x] ~~Voltage monitoring~~ ✓ Completed
- [x] ~~Automatic camera detection~~ ✓ Completed
- [ ] Support for multiple cameras
- [ ] Docker containerization
- [ ] Mobile app version
- [ ] Email/notification alerts for system issues
- [ ] Network traffic monitoring
- [ ] Process monitoring and management
- [ ] GPIO pin control and monitoring
- [ ] Custom dashboard widgets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Victor Chen (shenli570@gmail.com)

---

Built with React, Node.js, and Express for Raspberry Pi monitoring.

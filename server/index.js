import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Create directory for captured images
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Serve static images
app.use('/images', express.static(imagesDir));

// Get system information
app.get('/api/system-info', async (req, res) => {
  try {
    // Get CPU temperature
    let cpuTemp = 'N/A';
    try {
      const tempOutput = await execAsync('vcgencmd measure_temp');
      cpuTemp = tempOutput.stdout.trim().replace('temp=', '');
    } catch (e) {
      console.error('Error getting CPU temp:', e);
    }

    // Get CPU usage
    let cpuUsage = 'N/A';
    try {
      const cpuOutput = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'');
      cpuUsage = cpuOutput.stdout.trim() + '%';
    } catch (e) {
      console.error('Error getting CPU usage:', e);
    }

    // Get memory usage
    let memoryUsage = 'N/A';
    try {
      const memOutput = await execAsync('free | grep Mem | awk \'{printf "%.1f", $3/$2 * 100.0}\'');
      memoryUsage = memOutput.stdout.trim() + '%';
    } catch (e) {
      console.error('Error getting memory usage:', e);
    }

    // Get disk usage
    let diskSpace = 'N/A';
    try {
      const diskOutput = await execAsync('df -h / | tail -1 | awk \'{print $5}\'');
      diskSpace = diskOutput.stdout.trim() + ' used';
    } catch (e) {
      console.error('Error getting disk space:', e);
    }

    // Get uptime
    let uptime = 'N/A';
    try {
      const uptimeSeconds = os.uptime();
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      uptime = `${hours}h ${minutes}m`;
    } catch (e) {
      console.error('Error getting uptime:', e);
    }

    // Get hostname
    const hostname = os.hostname();

    // Get OS version
    let osVersion = 'Raspberry Pi OS';
    try {
      const osOutput = await execAsync('cat /etc/os-release | grep PRETTY_NAME | cut -d\\"=" -f2 | tr -d \'\\"\'');
      osVersion = osOutput.stdout.trim();
    } catch (e) {
      console.error('Error getting OS version:', e);
    }

    res.json({
      cpuTemp,
      cpuUsage,
      memoryUsage,
      diskSpace,
      uptime,
      hostname,
      osVersion
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Take a photo
app.post('/api/camera/photo', async (req, res) => {
  try {
    const timestamp = Date.now();
    const filename = `photo_${timestamp}.jpg`;
    const filepath = path.join(imagesDir, filename);

    // Capture photo using rpicam-still
    await execAsync(`rpicam-still -o ${filepath} --width 1920 --height 1080 --timeout 1 --nopreview`);

    res.json({
      success: true,
      filename,
      url: `/images/${filename}`,
      timestamp
    });
  } catch (error) {
    console.error('Error taking photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture photo. Make sure the camera is connected and enabled.'
    });
  }
});

// Start video streaming
let streamProcess = null;

app.get('/api/camera/stream/start', async (req, res) => {
  try {
    if (streamProcess) {
      return res.json({ success: true, message: 'Stream already running', url: '/api/camera/stream' });
    }

    res.json({
      success: true,
      message: 'Stream started',
      url: '/api/camera/stream'
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ success: false, error: 'Failed to start stream' });
  }
});

// Stop video streaming
app.get('/api/camera/stream/stop', (req, res) => {
  if (streamProcess) {
    streamProcess.kill();
    streamProcess = null;
  }
  res.json({ success: true, message: 'Stream stopped' });
});

// MJPEG stream endpoint
app.get('/api/camera/stream', async (req, res) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=FRAME',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Create a temporary file for streaming
    const streamFile = path.join(imagesDir, 'stream.jpg');

    // Continuously capture images
    const captureFrame = async () => {
      try {
        await execAsync(`rpicam-still -o ${streamFile} --width 1280 --height 720 --timeout 1 --nopreview`);

        if (fs.existsSync(streamFile)) {
          const imageData = fs.readFileSync(streamFile);
          res.write(`--FRAME\r\n`);
          res.write(`Content-Type: image/jpeg\r\n`);
          res.write(`Content-Length: ${imageData.length}\r\n\r\n`);
          res.write(imageData);
          res.write('\r\n');
        }

        // Capture next frame after a short delay
        if (!res.writableEnded) {
          setTimeout(captureFrame, 100); // ~10 fps
        }
      } catch (error) {
        if (!res.writableEnded) {
          console.error('Error capturing frame:', error);
          setTimeout(captureFrame, 500); // Retry after delay
        }
      }
    };

    captureFrame();

    req.on('close', () => {
      console.log('Stream closed by client');
    });

  } catch (error) {
    console.error('Error streaming:', error);
    res.status(500).json({ error: 'Failed to start video stream' });
  }
});

// List all captured images
app.get('/api/camera/images', (req, res) => {
  try {
    const files = fs.readdirSync(imagesDir)
      .filter(file => file.endsWith('.jpg') && !file.includes('stream'))
      .map(file => ({
        filename: file,
        url: `/images/${file}`,
        timestamp: parseInt(file.match(/\d+/)?.[0] || 0)
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({ images: files });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// Delete an image
app.delete('/api/camera/images/:filename', (req, res) => {
  try {
    const filepath = path.join(imagesDir, req.params.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`📷 Camera API ready`);
});

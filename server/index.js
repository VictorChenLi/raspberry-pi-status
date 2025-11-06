import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import cron from 'node-cron';

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

// Detect camera type
let cameraType = 'none';
let cameraDevice = '/dev/video0';

async function detectCamera() {
  console.log('🔍 Detecting camera...');

  // Method 1: Try rpicam-still --list-cameras for CSI camera
  try {
    const { stdout } = await execAsync('rpicam-still --list-cameras 2>&1');
    if (!stdout.includes('No cameras available')) {
      cameraType = 'csi';
      console.log('📷 CSI Camera detected (via rpicam-still)');
      return;
    }
  } catch (e) {
    // rpicam-still not available or failed, try other methods
  }

  // Method 2: Check for camera hardware using v4l2-ctl
  try {
    if (fs.existsSync('/dev/video0')) {
      const { stdout } = await execAsync('v4l2-ctl --device=/dev/video0 --all 2>&1');

      // Check if it's a CSI camera by looking for specific hardware identifiers
      const isBroadcomCamera = stdout.includes('bcm2835-codec') ||
                               stdout.includes('bcm2835-isp') ||
                               stdout.includes('mmal');

      const isPiCamera = stdout.includes('unicam') ||
                        stdout.includes('OV5647') ||
                        stdout.includes('IMX219') ||
                        stdout.includes('IMX477') ||
                        stdout.includes('IMX708');

      if (isBroadcomCamera || isPiCamera) {
        cameraType = 'csi';
        console.log('📷 CSI/Pi Camera detected (via v4l2-ctl)');
        console.log(`   Camera info: ${stdout.split('\n')[0]}`);
        return;
      } else {
        cameraType = 'usb';
        console.log('📷 USB Camera detected on /dev/video0');
        console.log(`   Camera info: ${stdout.split('\n')[0]}`);
        return;
      }
    }
  } catch (e) {
    console.log('⚠️  v4l2-ctl check failed:', e.message);
  }

  // Method 3: Check for CSI camera in /proc/device-tree
  try {
    const deviceTreePath = '/proc/device-tree/soc/i2c0mux/i2c@1/ov5647@36';
    const altDeviceTreePath = '/proc/device-tree/soc/csi1/port';

    if (fs.existsSync(deviceTreePath) || fs.existsSync(altDeviceTreePath)) {
      cameraType = 'csi';
      console.log('📷 CSI Camera detected (via device tree)');
      if (!fs.existsSync('/dev/video0')) {
        console.log('⚠️  CSI camera detected but /dev/video0 not found. Camera may need configuration.');
      }
      return;
    }
  } catch (e) {
    // Device tree check failed
  }

  // Method 4: Try libcamera-still as fallback for CSI
  try {
    const { stdout, stderr } = await execAsync('libcamera-still --list-cameras 2>&1');
    const output = stdout + stderr;
    if (!output.includes('No cameras available')) {
      cameraType = 'csi';
      console.log('📷 CSI Camera detected (via libcamera-still)');
      return;
    }
  } catch (e) {
    // libcamera-still not available
  }

  // Method 5: Final fallback - check if /dev/video0 exists (assume USB)
  try {
    if (fs.existsSync('/dev/video0')) {
      cameraType = 'usb';
      console.log('📷 Camera detected on /dev/video0 (assuming USB camera)');
      return;
    }
  } catch (e) {
    // No video device
  }

  console.log('⚠️  No camera detected');
  console.log('   Please ensure your camera is properly connected and configured.');
}

detectCamera();

// Get camera information
app.get('/api/camera/info', async (req, res) => {
  try {
    const info = {
      type: cameraType,
      device: cameraDevice,
      available: cameraType !== 'none'
    };

    // Try to get additional info for detected cameras
    if (cameraType !== 'none' && fs.existsSync('/dev/video0')) {
      try {
        const { stdout } = await execAsync('v4l2-ctl --device=/dev/video0 --info 2>&1');
        info.details = stdout.split('\n').slice(0, 5).join('\n');
      } catch (e) {
        // v4l2-ctl not available
      }
    }

    res.json(info);
  } catch (error) {
    console.error('Error getting camera info:', error);
    res.status(500).json({ error: 'Failed to get camera information' });
  }
});

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
    if (cameraType === 'none') {
      return res.status(500).json({
        success: false,
        error: 'No camera detected. Please connect a camera and restart the server.'
      });
    }

    const timestamp = Date.now();
    const filename = `photo_${timestamp}.jpg`;
    const filepath = path.join(imagesDir, filename);

    if (cameraType === 'csi') {
      // Capture photo using rpicam-still for CSI camera
      await execAsync(`rpicam-still -o ${filepath} --width 1920 --height 1080 --timeout 1 --nopreview`);
    } else if (cameraType === 'usb') {
      // Capture photo using ffmpeg for USB camera with MJPEG format
      await execAsync(`ffmpeg -f v4l2 -input_format mjpeg -video_size 1920x1080 -i ${cameraDevice} -frames:v 1 -update 1 -y ${filepath} 2>&1`);
    }

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
    if (cameraType === 'none') {
      return res.status(500).json({ error: 'No camera detected' });
    }

    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=FRAME',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    let streamProcess = null;
    let cleanup = false;

    // Cleanup function
    const cleanupStream = () => {
      cleanup = true;
      if (streamProcess) {
        streamProcess.kill('SIGTERM');
        streamProcess = null;
      }
    };

    req.on('close', () => {
      console.log('Stream closed by client');
      cleanupStream();
    });

    // Use frame-by-frame capture for both camera types
    // This is more reliable than trying to parse continuous MJPEG streams
    startFrameCapture();

    // Frame-by-frame capture method
    function startFrameCapture() {
      const streamFile = path.join(imagesDir, 'stream.jpg');

      const captureFrame = async () => {
        if (cleanup || res.writableEnded) return;

        try {
          if (cameraType === 'csi') {
            // Use rpicam-still with minimal timeout for faster capture
            await execAsync(`rpicam-still -o ${streamFile} --width 640 --height 480 --timeout 1 --nopreview 2>&1`, {
              timeout: 3000  // 3 second timeout
            });
          } else if (cameraType === 'usb') {
            // Try MJPEG format first for faster capture
            try {
              await execAsync(`ffmpeg -f v4l2 -input_format mjpeg -video_size 640x480 -i ${cameraDevice} -frames:v 1 -update 1 -y ${streamFile} 2>&1`, {
                timeout: 3000
              });
            } catch (e) {
              // Fallback to YUYV format
              await execAsync(`ffmpeg -f v4l2 -video_size 640x480 -i ${cameraDevice} -frames:v 1 -update 1 -y ${streamFile} 2>&1`, {
                timeout: 3000
              });
            }
          }

          if (fs.existsSync(streamFile) && !cleanup && !res.writableEnded) {
            const imageData = fs.readFileSync(streamFile);
            res.write(`--FRAME\r\n`);
            res.write(`Content-Type: image/jpeg\r\n`);
            res.write(`Content-Length: ${imageData.length}\r\n\r\n`);
            res.write(imageData);
            res.write('\r\n');
          }

          // Capture next frame immediately (command itself takes time)
          if (!cleanup && !res.writableEnded) {
            setImmediate(captureFrame); // Use setImmediate for next frame
          }
        } catch (error) {
          if (!cleanup && !res.writableEnded) {
            console.error('Error capturing frame:', error);
            setTimeout(captureFrame, 1000); // Retry after delay on error
          }
        }
      };

      captureFrame();
    }

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

// ============================================
// SYSTEM CONTROL ENDPOINTS
// ============================================

// Storage for shutdown schedules
const schedulesFile = path.join(__dirname, 'schedules.json');
let shutdownSchedules = [];
const activeCronJobs = new Map();

// Load schedules from file
function loadSchedules() {
  try {
    if (fs.existsSync(schedulesFile)) {
      const data = fs.readFileSync(schedulesFile, 'utf8');
      shutdownSchedules = JSON.parse(data);
      console.log(`📅 Loaded ${shutdownSchedules.length} shutdown schedules`);

      // Restart all enabled cron jobs
      shutdownSchedules.forEach(schedule => {
        if (schedule.enabled) {
          startCronJob(schedule);
        }
      });
    }
  } catch (error) {
    console.error('Error loading schedules:', error);
    shutdownSchedules = [];
  }
}

// Save schedules to file
function saveSchedules() {
  try {
    fs.writeFileSync(schedulesFile, JSON.stringify(shutdownSchedules, null, 2));
  } catch (error) {
    console.error('Error saving schedules:', error);
  }
}

// Convert time and days to cron expression
function toCronExpression(time, days) {
  const [hours, minutes] = time.split(':');
  const daysStr = days.sort().join(',');
  return `${minutes} ${hours} * * ${daysStr}`;
}

// Start a cron job for a schedule
function startCronJob(schedule) {
  try {
    const cronExpression = toCronExpression(schedule.time, schedule.days);

    if (activeCronJobs.has(schedule.id)) {
      // Stop existing job first
      activeCronJobs.get(schedule.id).stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`⏰ Scheduled shutdown triggered: ${schedule.id} at ${schedule.time}`);
      try {
        await execAsync('sudo shutdown -h now');
      } catch (error) {
        console.error('Error during scheduled shutdown:', error);
      }
    });

    activeCronJobs.set(schedule.id, job);
    console.log(`✓ Started cron job for schedule ${schedule.id}: ${cronExpression}`);
  } catch (error) {
    console.error(`Error starting cron job for schedule ${schedule.id}:`, error);
  }
}

// Stop a cron job for a schedule
function stopCronJob(scheduleId) {
  if (activeCronJobs.has(scheduleId)) {
    activeCronJobs.get(scheduleId).stop();
    activeCronJobs.delete(scheduleId);
    console.log(`✓ Stopped cron job for schedule ${scheduleId}`);
  }
}

// Initialize schedules on startup
loadSchedules();

// Get all schedules
app.get('/api/system/schedules', (req, res) => {
  res.json({ schedules: shutdownSchedules });
});

// Add a new schedule
app.post('/api/system/schedules', (req, res) => {
  try {
    const { time, days, enabled = true } = req.body;

    if (!time || !days || days.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Time and days are required'
      });
    }

    const newSchedule = {
      id: Date.now().toString(),
      time,
      days,
      enabled,
      created: new Date().toISOString()
    };

    shutdownSchedules.push(newSchedule);
    saveSchedules();

    if (enabled) {
      startCronJob(newSchedule);
    }

    res.json({
      success: true,
      schedule: newSchedule
    });

    console.log(`✓ Added new shutdown schedule: ${time} on days ${days.join(',')}`);
  } catch (error) {
    console.error('Error adding schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add schedule'
    });
  }
});

// Update a schedule (enable/disable)
app.patch('/api/system/schedules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const schedule = shutdownSchedules.find(s => s.id === id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    schedule.enabled = enabled;
    saveSchedules();

    if (enabled) {
      startCronJob(schedule);
    } else {
      stopCronJob(id);
    }

    res.json({ success: true, schedule });

    console.log(`✓ ${enabled ? 'Enabled' : 'Disabled'} schedule ${id}`);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule'
    });
  }
});

// Delete a schedule
app.delete('/api/system/schedules/:id', (req, res) => {
  try {
    const { id } = req.params;

    const index = shutdownSchedules.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    shutdownSchedules.splice(index, 1);
    saveSchedules();

    stopCronJob(id);

    res.json({ success: true });

    console.log(`✓ Deleted schedule ${id}`);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete schedule'
    });
  }
});

// Immediate shutdown
app.post('/api/system/shutdown', async (req, res) => {
  try {
    console.log('⚠️  Immediate shutdown requested');
    res.json({
      success: true,
      message: 'System is shutting down...'
    });

    // Delay the actual shutdown to allow response to be sent
    setTimeout(async () => {
      try {
        await execAsync('sudo shutdown -h now');
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('Error initiating shutdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate shutdown'
    });
  }
});

// Immediate reboot
app.post('/api/system/reboot', async (req, res) => {
  try {
    console.log('⚠️  Immediate reboot requested');
    res.json({
      success: true,
      message: 'System is rebooting...'
    });

    // Delay the actual reboot to allow response to be sent
    setTimeout(async () => {
      try {
        await execAsync('sudo reboot');
      } catch (error) {
        console.error('Error during reboot:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('Error initiating reboot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate reboot'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`📷 Camera API ready`);
});

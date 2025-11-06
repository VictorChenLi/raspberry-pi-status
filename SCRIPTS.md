# Server Management Scripts

Simple, unified script to manage both the backend and frontend servers.

## Quick Start

```bash
# Start in background mode (daemon)
./start.sh --background

# Check status
./start.sh --status

# Stop servers
./start.sh --stop
```

---

## The start.sh Script

One script to rule them all! The `start.sh` script handles everything:

### Usage

```bash
./start.sh [OPTION]
```

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--background` | `-b` | Start servers in background mode (daemon) |
| `--foreground` | `-f` | Start servers in foreground mode (default) |
| `--stop` | `-s` | Stop all running servers |
| `--status` | | Check server status and health |
| `--help` | `-h` | Show help message |

### Examples

```bash
# Start in background (servers run as daemon)
./start.sh --background
./start.sh -b              # short alias

# Start in foreground (interactive, shows logs)
./start.sh --foreground
./start.sh -f              # short alias
./start.sh                 # default is foreground

# Stop all servers
./start.sh --stop
./start.sh -s              # short alias

# Check status
./start.sh --status

# Show help
./start.sh --help
./start.sh -h
```

---

## Key Features

### 🔄 Automatic Restart
Every time you run `./start.sh`, it automatically:
1. Checks for existing running servers
2. Stops them if found
3. Starts fresh servers

**No need to manually stop servers first!** Just run the start command again.

```bash
# These commands automatically stop old servers before starting:
./start.sh --background    # Restarts in background mode
./start.sh --foreground    # Restarts in foreground mode
```

### 📊 Status Checks
The status command shows:
- Which servers are running (with PIDs)
- Ports and URLs
- Backend API health
- Camera detection status

### 🗂️ Convenience Scripts

**status.sh** - Quick alias to check status:
```bash
./status.sh
# Same as: ./start.sh --status
```

---

## Modes Explained

### Background Mode (Daemon)
```bash
./start.sh --background
```

**Features:**
- Servers run in the background
- Terminal can be closed without stopping servers
- Logs saved to `logs/backend.log` and `logs/frontend.log`
- Perfect for production or long-running sessions

**Use when:** You want the servers to keep running after closing the terminal.

### Foreground Mode (Interactive)
```bash
./start.sh --foreground
./start.sh              # default
```

**Features:**
- Logs displayed directly in terminal
- Press Ctrl+C to stop both servers
- Real-time output for debugging
- Perfect for development

**Use when:** You want to actively monitor logs and debug.

---

## Log Management

When running in background mode, logs are stored in:

```
logs/
├── backend.log       # Backend server logs
├── frontend.log      # Frontend dev server logs
├── backend.pid       # Backend process ID
└── frontend.pid      # Frontend process ID
```

### View Logs

```bash
# View last 50 lines
tail -n 50 logs/backend.log
tail -n 50 logs/frontend.log

# Follow logs in real-time
tail -f logs/backend.log
tail -f logs/frontend.log

# View both logs together
tail -f logs/*.log
```

### Clear Old Logs

```bash
# Clear logs
> logs/backend.log
> logs/frontend.log

# Or remove them
rm logs/*.log
```

---

## Common Workflows

### Development Workflow
```bash
# Start in foreground to see logs
./start.sh

# Make changes to code...
# Press Ctrl+C to stop

# Restart (old servers auto-stopped)
./start.sh
```

### Production/Demo Workflow
```bash
# Start in background
./start.sh --background

# Check it's running
./start.sh --status

# View logs if needed
tail -f logs/backend.log

# Stop when done
./start.sh --stop
```

### Quick Restart
```bash
# Just run start again - it auto-stops old servers!
./start.sh --background

# Need to switch to foreground mode? Just run:
./start.sh --foreground
```

---

## Accessing the Application

Once started, access at:

- **Local:** https://localhost:5173/
- **Network:** https://[your-pi-ip]:5173/
- **Backend API:** http://localhost:3001/

Use `./start.sh --status` to see your specific URLs.

---

## Troubleshooting

### Servers Won't Start

1. **Check if dependencies are installed:**
   ```bash
   npm install
   ```

2. **Check the logs:**
   ```bash
   cat logs/backend.log
   cat logs/frontend.log
   ```

3. **Verify ports are available:**
   ```bash
   lsof -i :3001  # Backend
   lsof -i :5173  # Frontend
   ```

### Port Already in Use

The script automatically kills old processes, but if you have other apps using these ports:

```bash
# Find what's using the port
lsof -i :3001
lsof -i :5173

# Kill specific process
kill <PID>
```

### Script Won't Execute

Make sure it's executable:
```bash
chmod +x start.sh status.sh
```

### Camera Not Detected

Check camera status:
```bash
./start.sh --status
```

If camera shows as "not detected":
- Verify camera is physically connected
- Enable camera in `raspi-config`
- Check backend logs: `cat logs/backend.log`

---

## Advanced Usage

### Run on System Startup

Add to crontab:
```bash
crontab -e

# Add this line:
@reboot cd /path/to/raspberry-pi-status && ./start.sh --background
```

Or use systemd (create a service file).

### Remote Access

Make sure your Pi's firewall allows connections on port 5173:
```bash
sudo ufw allow 5173
```

Then access from any device on your network using:
```
https://[raspberry-pi-ip]:5173/
```

---

## Summary

- **One script:** `./start.sh` does everything
- **Auto-restart:** No need to stop manually, just run start again
- **Two modes:** Background (daemon) or Foreground (interactive)
- **Easy status:** `./start.sh --status` or `./status.sh`
- **Smart logs:** Background mode saves logs, foreground shows them

**Most common command:**
```bash
./start.sh --background
```

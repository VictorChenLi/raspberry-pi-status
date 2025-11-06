#!/bin/bash
# Unified script to start/stop Raspberry Pi Status Monitor
# Usage:
#   ./start.sh              - Start in foreground mode (default)
#   ./start.sh --foreground - Start in foreground mode
#   ./start.sh --background - Start in background mode
#   ./start.sh --stop       - Stop all servers
#   ./start.sh --status     - Check server status

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default mode
MODE="foreground"

# Parse arguments
if [ $# -gt 0 ]; then
    case "$1" in
        --background|-b)
            MODE="background"
            ;;
        --foreground|-f)
            MODE="foreground"
            ;;
        --stop|-s)
            MODE="stop"
            ;;
        --status)
            MODE="status"
            ;;
        --help|-h)
            echo "Raspberry Pi Status Monitor - Control Script"
            echo ""
            echo "Usage:"
            echo "  ./start.sh              Start in foreground mode (default)"
            echo "  ./start.sh --foreground Start in foreground mode"
            echo "  ./start.sh --background Start in background mode"
            echo "  ./start.sh --stop       Stop all servers"
            echo "  ./start.sh --status     Check server status"
            echo "  ./start.sh --help       Show this help"
            echo ""
            echo "Aliases:"
            echo "  -f, --foreground"
            echo "  -b, --background"
            echo "  -s, --stop"
            echo "  -h, --help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use './start.sh --help' for usage information"
            exit 1
            ;;
    esac
fi

# Function to stop all servers
stop_servers() {
    echo "================================================"
    echo "  Stopping Raspberry Pi Status Monitor"
    echo "================================================"
    echo ""

    STOPPED_ANY=false

    # Stop backend server
    if [ -f logs/backend.pid ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${YELLOW}Stopping backend server (PID: $BACKEND_PID)...${NC}"
            kill $BACKEND_PID 2>/dev/null
            sleep 1
            # Force kill if still running
            if kill -0 $BACKEND_PID 2>/dev/null; then
                kill -9 $BACKEND_PID 2>/dev/null
            fi
            echo -e "${GREEN}✓ Backend server stopped${NC}"
            STOPPED_ANY=true
        fi
        rm -f logs/backend.pid
    fi

    # Also check for any running node server processes
    NODE_PIDS=$(pgrep -f "node server/index.js")
    if [ ! -z "$NODE_PIDS" ]; then
        echo -e "${YELLOW}Found running backend processes: $NODE_PIDS${NC}"
        kill $NODE_PIDS 2>/dev/null
        sleep 1
        # Force kill if still running
        pkill -9 -f "node server/index.js" 2>/dev/null
        echo -e "${GREEN}✓ Backend server stopped${NC}"
        STOPPED_ANY=true
    fi

    # Stop frontend server
    if [ -f logs/frontend.pid ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${YELLOW}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
            kill $FRONTEND_PID 2>/dev/null
            sleep 1
            # Force kill if still running
            if kill -0 $FRONTEND_PID 2>/dev/null; then
                kill -9 $FRONTEND_PID 2>/dev/null
            fi
        fi
        rm -f logs/frontend.pid
    fi

    # Also check for any running vite processes
    VITE_PIDS=$(pgrep -f "vite --host")
    if [ ! -z "$VITE_PIDS" ]; then
        echo -e "${YELLOW}Found running frontend processes: $VITE_PIDS${NC}"
        kill $VITE_PIDS 2>/dev/null
        sleep 1
        # Force kill if still running
        pkill -9 -f "vite --host" 2>/dev/null
        echo -e "${GREEN}✓ Frontend server stopped${NC}"
        STOPPED_ANY=true
    fi

    # Also kill npm run dev process
    NPM_PIDS=$(pgrep -f "npm run dev")
    if [ ! -z "$NPM_PIDS" ]; then
        kill $NPM_PIDS 2>/dev/null
    fi

    echo ""
    if [ "$STOPPED_ANY" = true ]; then
        echo -e "${GREEN}All servers stopped successfully!${NC}"
    else
        echo -e "${YELLOW}No running servers found.${NC}"
    fi
    echo "================================================"
    echo ""
}

# Function to check status
check_status() {
    echo "================================================"
    echo "  Raspberry Pi Status Monitor - Status Check"
    echo "================================================"
    echo ""

    # Check backend server
    echo -e "${BLUE}Backend Server:${NC}"
    BACKEND_RUNNING=false

    BACKEND_PID=$(pgrep -f "node server/index.js")
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "  Status: ${GREEN}✓ Running${NC} (PID: $BACKEND_PID)"
        BACKEND_RUNNING=true
        echo "  Port:   3001"
        echo "  URL:    http://localhost:3001"
    else
        echo -e "  Status: ${RED}✗ Not running${NC}"
    fi

    echo ""

    # Check frontend server
    echo -e "${BLUE}Frontend Server:${NC}"
    FRONTEND_RUNNING=false

    VITE_PID=$(pgrep -f "vite --host")
    if [ ! -z "$VITE_PID" ]; then
        echo -e "  Status: ${GREEN}✓ Running${NC} (PID: $VITE_PID)"
        FRONTEND_RUNNING=true
        echo "  Port:   5173"
        echo "  URL:    https://localhost:5173/"
        LOCAL_IP=$(hostname -I | awk '{print $1}')
        echo "  Network: https://$LOCAL_IP:5173/"
    else
        echo -e "  Status: ${RED}✗ Not running${NC}"
    fi

    echo ""
    echo "================================================"

    # Quick health check if servers are running
    if [ "$BACKEND_RUNNING" = true ]; then
        echo ""
        echo -e "${BLUE}Quick Health Check:${NC}"

        # Check backend API
        if curl -s -f http://localhost:3001/api/camera/info > /dev/null 2>&1; then
            echo -e "  Backend API: ${GREEN}✓ Responding${NC}"
        else
            echo -e "  Backend API: ${RED}✗ Not responding${NC}"
        fi

        # Get camera info
        CAMERA_INFO=$(curl -s http://localhost:3001/api/camera/info 2>/dev/null)
        if [ ! -z "$CAMERA_INFO" ]; then
            CAMERA_TYPE=$(echo $CAMERA_INFO | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
            if [ "$CAMERA_TYPE" != "none" ]; then
                echo -e "  Camera:      ${GREEN}✓ Detected ($CAMERA_TYPE)${NC}"
            else
                echo -e "  Camera:      ${RED}✗ Not detected${NC}"
            fi
        fi

        echo "================================================"
    fi
}

# Execute based on mode
case "$MODE" in
    stop)
        stop_servers
        exit 0
        ;;
    status)
        check_status
        exit 0
        ;;
esac

# Stop any existing servers before starting
echo -e "${BLUE}Checking for existing servers...${NC}"
NODE_PIDS=$(pgrep -f "node server/index.js")
VITE_PIDS=$(pgrep -f "vite --host")
if [ ! -z "$NODE_PIDS" ] || [ ! -z "$VITE_PIDS" ]; then
    echo -e "${YELLOW}Found running servers, stopping them first...${NC}"
    stop_servers
else
    echo -e "${GREEN}No existing servers found.${NC}"
    echo ""
fi

# Start servers based on mode
if [ "$MODE" = "background" ]; then
    echo "================================================"
    echo "  Raspberry Pi Status Monitor - Background Mode"
    echo "================================================"
    echo ""

    # Create logs directory if it doesn't exist
    mkdir -p logs

    # Start backend server
    echo -e "${GREEN}Starting backend server...${NC}"
    nohup node server/index.js > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid

    # Wait a moment for backend to start
    sleep 2

    # Check if backend is running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Failed to start backend server!${NC}"
        echo "Check logs/backend.log for details"
        exit 1
    fi

    echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"

    # Start frontend server
    echo -e "${GREEN}Starting frontend dev server...${NC}"
    nohup npm run dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > logs/frontend.pid

    # Wait a moment for frontend to start
    sleep 8

    # Check if frontend is running (check for vite process)
    VITE_PID=$(pgrep -f "vite --host")
    if [ -z "$VITE_PID" ]; then
        echo -e "${RED}Failed to start frontend server!${NC}"
        echo "Check logs/frontend.log for details"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi

    echo -e "${GREEN}✓ Frontend server started (PID: $VITE_PID)${NC}"
    echo ""
    echo "================================================"
    echo -e "${BLUE}Both servers are running in background!${NC}"
    echo ""
    echo "Access the application at:"
    echo "  - Local:   https://localhost:5173/"
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "  - Network: https://$LOCAL_IP:5173/"
    echo ""
    echo "Backend API running on: http://localhost:3001"
    echo ""
    echo "Logs:"
    echo "  - Backend:  logs/backend.log"
    echo "  - Frontend: logs/frontend.log"
    echo ""
    echo "Commands:"
    echo "  - Stop servers:  ./start.sh --stop"
    echo "  - Check status:  ./start.sh --status"
    echo "  - View logs:     tail -f logs/backend.log"
    echo "                   tail -f logs/frontend.log"
    echo "================================================"

else
    # Foreground mode
    echo "================================================"
    echo "  Raspberry Pi Status Monitor - Foreground Mode"
    echo "================================================"
    echo ""

    # Trap Ctrl+C and kill both processes
    trap 'echo -e "\n${BLUE}Stopping servers...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

    # Start backend server
    echo -e "${GREEN}Starting backend server...${NC}"
    node server/index.js &
    BACKEND_PID=$!

    # Wait a moment for backend to start
    sleep 2

    # Check if backend is running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Failed to start backend server!${NC}"
        exit 1
    fi

    echo -e "${GREEN}Backend server started (PID: $BACKEND_PID)${NC}"
    echo ""

    # Start frontend server
    echo -e "${GREEN}Starting frontend dev server...${NC}"
    npm run dev &
    FRONTEND_PID=$!

    # Wait a moment for frontend to start
    sleep 3

    # Check if frontend is running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}Failed to start frontend server!${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi

    echo -e "${GREEN}Frontend server started (PID: $FRONTEND_PID)${NC}"
    echo ""
    echo "================================================"
    echo -e "${BLUE}Both servers are running!${NC}"
    echo ""
    echo "Access the application at:"
    echo "  - Local:   https://localhost:5173/"
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "  - Network: https://$LOCAL_IP:5173/"
    echo ""
    echo "Backend API running on: http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    echo "================================================"

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
fi

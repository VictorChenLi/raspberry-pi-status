import { useState, useRef, useEffect } from 'react';
import './Camera.css';

const API_BASE = '/api/camera';

function Camera({ hostname = 'Raspberry Pi' }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraInfo, setCameraInfo] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    // Load existing images and camera info on mount
    fetchImages();
    fetchCameraInfo();

    return () => {
      // Cleanup: stop the stream when component unmounts
      if (isStreaming) {
        stopStream();
      }
    };
  }, []);

  useEffect(() => {
    // Set image src when streaming starts
    if (isStreaming && imgRef.current) {
      imgRef.current.src = `${API_BASE}/stream?${Date.now()}`;
    }
  }, [isStreaming]);

  const fetchImages = async () => {
    try {
      const response = await fetch(`${API_BASE}/images`);
      const data = await response.json();
      setCapturedImages(data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const fetchCameraInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/info`);
      const data = await response.json();
      setCameraInfo(data);
      if (!data.available) {
        setCameraError('No camera detected. Please ensure your camera is connected and configured.');
      }
    } catch (error) {
      console.error('Error fetching camera info:', error);
    }
  };

  const startStream = async () => {
    try {
      setCameraError(null);
      setIsStreaming(true);
    } catch (error) {
      console.error('Error starting stream:', error);
      setCameraError('Unable to start camera stream.');
      setIsStreaming(false);
    }
  };

  const stopStream = async () => {
    try {
      if (imgRef.current) {
        imgRef.current.src = '';
      }
      setIsStreaming(false);
      await fetch(`${API_BASE}/stream/stop`);
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  };

  const capturePhoto = async () => {
    try {
      setIsCapturing(true);
      setCameraError(null);

      const response = await fetch(`${API_BASE}/photo`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the images list
        await fetchImages();
      } else {
        setCameraError(data.error || 'Failed to capture photo');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      setCameraError('Failed to capture photo. Make sure the Pi camera is connected.');
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.target = '_blank';
    link.click();
  };

  const deleteImage = async (filename) => {
    try {
      const response = await fetch(`${API_BASE}/images/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the images list
        await fetchImages();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
    <div className="camera-container">
      <h2>{hostname} Camera</h2>

      {cameraError && (
        <div className="camera-error">
          <p>{cameraError}</p>
        </div>
      )}

      <div className="camera-view">
        <div className="video-container">
          {isStreaming ? (
            <img
              ref={imgRef}
              alt="Pi Camera Stream"
              className="stream-image"
              onError={(e) => {
                console.error('Stream image failed to load:', e);
                setCameraError('Failed to load camera stream. Please try again.');
                setIsStreaming(false);
              }}
            />
          ) : (
            <div className="camera-placeholder">
              <div className="placeholder-icon">📷</div>
              <p>Click "Start Camera" to begin streaming</p>
            </div>
          )}
        </div>
      </div>

      <div className="camera-controls">
        {!isStreaming ? (
          <button onClick={startStream} className="btn btn-primary">
            ▶️ Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={capturePhoto}
              className="btn btn-capture"
              disabled={isCapturing}
            >
              {isCapturing ? '⏳ Capturing...' : '📸 Take Photo'}
            </button>
            <button onClick={stopStream} className="btn btn-danger">
              ⏹️ Stop Camera
            </button>
          </>
        )}
      </div>

      <div className="camera-info">
        {cameraInfo && (
          <>
            <p>
              <strong>Camera Type:</strong>{' '}
              {cameraInfo.type === 'csi' ? '📹 CSI/Pi Camera' :
               cameraInfo.type === 'usb' ? '📷 USB Camera' : '❌ Not detected'}
              {cameraInfo.device && ` (${cameraInfo.device})`}
            </p>
            <p>
              <strong>Status:</strong> {isStreaming ? '🟢 Streaming' : '🔴 Not streaming'}
            </p>
          </>
        )}
        {!cameraInfo && (
          <p>
            <strong>Note:</strong> Detecting camera...
          </p>
        )}
      </div>

      {capturedImages.length > 0 && (
        <div className="captured-images">
          <h3>Captured Photos ({capturedImages.length})</h3>
          <div className="images-grid">
            {capturedImages.map((image) => (
              <div key={image.filename} className="image-card">
                <img
                  src={image.url}
                  alt={image.filename}
                  loading="lazy"
                />
                <div className="image-actions">
                  <button
                    onClick={() => downloadImage(image.url, image.filename)}
                    className="btn-small btn-success"
                    title="Download"
                  >
                    💾
                  </button>
                  <button
                    onClick={() => deleteImage(image.filename)}
                    className="btn-small btn-danger"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Camera;

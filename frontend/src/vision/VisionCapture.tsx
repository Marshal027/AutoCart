import { useRef, useState, useEffect, type ChangeEvent } from 'react';

interface VisionCaptureProps {
  /** Callback triggered with the base64 data URL of the captured image. */
  onCapture: (base64Image: string) => void;
  /** Optional callback triggered when camera access fails. */
  onError?: (error: Error) => void;
}

/**
 * VisionCapture provides access to the user's rear camera to snap a photo,
 * falling back to an image file upload if camera access is blocked or unsupported.
 */
export default function VisionCapture({ onCapture, onError }: VisionCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Auto-start camera on mount; clean up tracks on unmount.
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasCameraAccess && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [hasCameraAccess, stream]);

  const startCamera = async (): Promise<void> => {
    stopCamera();
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access API (getUserMedia) is not supported in this browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      setStream(mediaStream);
      streamRef.current = mediaStream;
      setHasCameraAccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn('Camera access failed; falling back to file input:', error);
      setHasCameraAccess(false);
      setErrorMsg(error.message || 'Could not access the camera. Please upload an image.');
      onError?.(error);
    }
  };

  const stopCamera = (): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    } else if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureFrame = (): void => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    // Compressed base64 JPEG at 80% quality
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(base64Image);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        onCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = (): void => {
    fileInputRef.current?.click();
  };

  return (
    <div className="vision-capture">
      {hasCameraAccess === true ? (
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
          <div className="camera-overlay">
            <div className="target-reticle" />
          </div>

          <div className="capture-controls">
            <button
              type="button"
              onClick={triggerFileUpload}
              className="action-btn secondary-btn"
              title="Upload File"
            >
              🖼️ Upload
            </button>

            <button
              type="button"
              onClick={captureFrame}
              className="capture-btn"
              aria-label="Capture photo"
            >
              <div className="capture-btn-inner" />
            </button>

            <button
              type="button"
              onClick={startCamera}
              className="action-btn secondary-btn"
              title="Refresh Camera"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="fallback-container">
          <div className="fallback-icon">📷</div>
          <h3>Camera Access Required</h3>
          <p className="fallback-message">
            {errorMsg ||
              'We need camera permission to scan products directly. You can also upload a photo instead.'}
          </p>
          <div className="fallback-actions">
            <button type="button" onClick={triggerFileUpload} className="action-btn primary-btn">
              Upload a Photo
            </button>
            <button type="button" onClick={startCamera} className="action-btn secondary-btn">
              Try Accessing Camera Again
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      {/* Off-screen canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

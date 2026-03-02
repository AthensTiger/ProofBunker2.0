import { useRef, useState, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setError('Unable to access camera. Please check permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setPreview(canvas.toDataURL('image/jpeg', 0.9));
  };

  const retake = () => {
    setPreview(null);
  };

  const usePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stream?.getTracks().forEach((t) => t.stop());
      onCapture(file);
    }, 'image/jpeg', 0.9);
  };

  const handleClose = () => {
    stream?.getTracks().forEach((t) => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-semibold text-gray-900">Take Photo</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>

        <div className="relative bg-black aspect-[4/3]">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm p-4 text-center">
              {error}
            </div>
          ) : preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex justify-center gap-3 p-3">
          {error ? (
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              Close
            </button>
          ) : preview ? (
            <>
              <button onClick={retake} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                Retake
              </button>
              <button onClick={usePhoto} className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg">
                Use Photo
              </button>
            </>
          ) : (
            <button onClick={capture} className="w-14 h-14 rounded-full border-4 border-amber-700 bg-white hover:bg-amber-50 transition-colors" title="Capture" />
          )}
        </div>
      </div>
    </div>
  );
}

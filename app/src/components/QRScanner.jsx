import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

/**
 * Minimal QR scanner lifted from parking scan app.
 * onScan(rawText) fires once per stable scan (2 consecutive reads).
 */
export function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    let lastText = '';
    let stability = 0;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const text = result?.data || result;
        if (text === lastText) { stability++; } else { stability = 1; lastText = text; }
        if (stability >= 2 && text) {
          stability = 0; lastText = '';
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          scanner.pause();
          setIsActive(false);
          onScan(text);
        }
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 10 }
    );

    scannerRef.current = scanner;

    QrScanner.listCameras(true).then(cams => {
      setCameras(cams);
      const back = cams.find(c => c.label.toLowerCase().includes('back'));
      setSelectedCamera(back?.id || cams[0]?.id || null);
    });

    // Auto-start
    scanner.start().then(() => {
      setIsActive(true);
      const stream = videoRef.current?.srcObject;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track?.getCapabilities()?.torch) setTorchAvailable(true);
      }
    }).catch(() => {});

    return () => { scanner.destroy(); scannerRef.current = null; };
  }, []);

  useEffect(() => {
    if (scannerRef.current && selectedCamera && isActive) {
      scannerRef.current.setCamera(selectedCamera);
    }
  }, [selectedCamera]);

  const toggleTorch = async () => {
    try {
      const track = videoRef.current?.srcObject?.getVideoTracks()[0];
      if (track) { await track.applyConstraints({ advanced: [{ torch: !torchOn }] }); setTorchOn(!torchOn); }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video */}
      <div className="relative flex-1">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline />

        {/* Flash */}
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-300 ${flash ? 'opacity-50' : 'opacity-0'}`} />

        {/* Scanning pill */}
        {isActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Scanning…
          </div>
        )}

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {torchAvailable && (
            <button onClick={toggleTorch}
              className={`p-3 rounded-full backdrop-blur-sm transition-colors ${torchOn ? 'bg-yellow-500/80' : 'bg-black/60'}`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          )}
          {cameras.length > 1 && (
            <button onClick={() => {
              const idx = cameras.findIndex(c => c.id === selectedCamera);
              setSelectedCamera(cameras[(idx + 1) % cameras.length].id);
            }} className="p-3 rounded-full bg-black/60 backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <p className="text-slate-400 text-sm">Point at DevEUI or LoRa Alliance QR code</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-medium">Cancel</button>
      </div>
    </div>
  );
}

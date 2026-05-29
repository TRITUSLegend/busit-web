'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Scanner() {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        if (!loading && !scannedId) {
          setScannedId(decodedText);
          handlePayment(decodedText);
          scanner.pause(true);
        }
      },
      (err) => {
        // ignore noisy scanning errors
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [loading, scannedId]);

  const handlePayment = async (studentId: string) => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/payment/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || 'Payment Successful!');
      } else {
        setError(data.error || 'Payment Failed');
      }
    } catch (err) {
      setError('An error occurred during payment');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setScannedId(null);
        setMessage('');
        setError('');
        // We can't automatically unpause the scanner here easily without a reference to it,
        // so we just let the user re-mount or reload for simplicity in this prototype.
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div id="reader" className="w-full max-w-sm rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/50"></div>
      
      <div className="mt-6 w-full text-center min-h-[60px]">
        {loading && <div className="text-blue-400 font-semibold animate-pulse">Processing Payment...</div>}
        {message && <div className="text-green-400 font-semibold bg-green-400/10 p-3 rounded-lg border border-green-400/20">{message}</div>}
        {error && <div className="text-red-400 font-semibold bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
        {!loading && !message && !error && (
          <div className="text-gray-400 text-sm">Aim camera at Student QR Code</div>
        )}
      </div>

      {(message || error) && (
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary mt-4 max-w-xs"
        >
          Scan Next
        </button>
      )}
    </div>
  );
}

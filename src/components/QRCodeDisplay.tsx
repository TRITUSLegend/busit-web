'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ studentId }: { studentId: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(studentId, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0f172a', // deep slate
        light: '#ffffff'
      }
    })
      .then(url => {
        setSrc(url);
      })
      .catch(err => {
        console.error(err);
      });
  }, [studentId]);

  if (!src) return <div className="w-[200px] h-[200px] flex items-center justify-center border border-white/10 rounded-xl bg-white/5"><div className="loader"></div></div>;

  return (
    <div className="bg-white p-2 rounded-xl shadow-lg inline-block">
      <img src={src} alt="Student QR Code" className="w-[200px] h-[200px] object-contain rounded-lg" />
    </div>
  );
}

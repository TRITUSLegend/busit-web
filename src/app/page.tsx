'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import Scanner from '@/components/Scanner';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/user/status');
      const data = await res.json();
      if (data.success) {
        setUserData(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCard = async () => {
    if (!confirm('Are you sure you want to block your card?')) return;
    try {
      await fetch('/api/user/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BLOCK' })
      });
      fetchUserData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCredits = async () => {
    const amountStr = prompt('Enter credits to add:');
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Invalid amount');

    try {
      await fetch('/api/payment/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      fetchUserData();
    } catch (err) {
      console.error(err);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="flex h-screen w-full items-center justify-center"><div className="loader"></div></div>;
  }

  if (!session) return null;

  const isDriver = session.user.role === 'DRIVER';

  return (
    <div className="w-full max-w-[480px] mt-6 sm:mt-12 mx-auto p-5 sm:p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 m-0">BUSIT</h1>
          <p className="text-zinc-500 text-xs mt-0.5 font-medium tracking-wide uppercase">{isDriver ? 'Driver Portal' : 'Student Wallet'}</p>
        </div>
        <button 
          onClick={() => signOut()} 
          className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-100">Welcome, {userData?.name}</h2>
        <p className="text-sm text-zinc-500">ID: <span className="font-mono text-zinc-400">{userData?.studentId}</span></p>
      </div>

      {isDriver ? (
        <div className="flex flex-col items-center">
          <h3 className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wider">Scan Student ID</h3>
          <Scanner />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between bg-zinc-950 p-5 rounded-xl border border-zinc-800 mb-6 shadow-inner">
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Balance</p>
              <p className="text-3xl font-bold text-zinc-100 flex items-baseline gap-1">
                {userData?.credits} <span className="text-sm text-zinc-500 font-medium">CR</span>
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${userData?.cardStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {userData?.cardStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8 bg-zinc-950 rounded-xl border border-zinc-800 mb-6">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-5">Your Boarding Pass</p>
            {userData?.cardStatus === 'ACTIVE' ? (
              <QRCodeDisplay studentId={userData?.studentId} />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center border border-red-500/20 rounded-xl bg-red-500/5 text-red-400 font-medium text-center p-4">
                Card Blocked<br/>Cannot Generate Pass
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button 
              onClick={handleAddCredits} 
              className="flex-1 p-3 rounded-xl bg-transparent border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white transition-colors text-sm"
            >
              Add Credits
            </button>
            <button 
              onClick={handleBlockCard} 
              disabled={userData?.cardStatus === 'BLOCKED'} 
              className="flex-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-medium hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Block Card
            </button>
          </div>

          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent Activity</h3>
            {userData?.transactions?.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {userData.transactions.map((tx: any) => (
                  <div key={tx.id} className="flex justify-between items-center p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{tx.type === 'PAYMENT' ? 'Shuttle Ride' : 'Top Up'}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <div className={`font-semibold text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">No recent activity</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

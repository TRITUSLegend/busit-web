'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'DRIVER'>('STUDENT');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      studentId,
      password,
    });

    if (res?.error) {
      setError('Invalid ID or Password');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-[400px] mt-10 md:mt-24 mx-auto p-6 md:p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">BUSIT Login</h1>
        <p className="text-zinc-400 text-sm mt-1">Access your digital shuttle wallet</p>
      </div>

      <div className="flex p-1 mb-8 bg-zinc-950 border border-zinc-800 rounded-xl">
        <button
          onClick={() => { setActiveTab('STUDENT'); setStudentId(''); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'STUDENT' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Student
        </button>
        <button
          onClick={() => { setActiveTab('DRIVER'); setStudentId(''); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'DRIVER' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Driver
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5" htmlFor="studentId">
            {activeTab === 'STUDENT' ? 'Student ID' : 'Driver ID'}
          </label>
          <input
            id="studentId"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder={activeTab === 'STUDENT' ? 'e.g. 23BCT0104' : 'e.g. DRV-001'}
            required
            className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-2 p-3 rounded-xl bg-zinc-100 text-zinc-900 font-semibold hover:bg-white active:scale-[0.98] transition-all flex justify-center items-center h-12"
        >
          {loading ? <div className="loader border-zinc-900 border-t-zinc-400"></div> : `Sign In as ${activeTab === 'STUDENT' ? 'Student' : 'Driver'}`}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-400">
        New here? <Link href="/register" className="text-zinc-100 font-medium hover:underline">Create an account</Link>
      </div>
    </div>
  );
}

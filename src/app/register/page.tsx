'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'DRIVER'>('STUDENT');
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: activeTab })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mt-10 md:mt-12 mx-auto p-6 md:p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Create Account</h1>
        <p className="text-zinc-400 text-sm mt-1">Join the BUSIT network</p>
      </div>

      <div className="flex p-1 mb-8 bg-zinc-950 border border-zinc-800 rounded-xl">
        <button
          type="button"
          onClick={() => { setActiveTab('STUDENT'); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'STUDENT' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Student
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('DRIVER'); setError(''); }}
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            {activeTab === 'STUDENT' ? 'Student ID' : 'Driver ID'}
          </label>
          <input
            type="text"
            value={formData.studentId}
            onChange={(e) => setFormData({...formData, studentId: e.target.value})}
            placeholder={activeTab === 'STUDENT' ? 'e.g. 23BCT0104' : 'e.g. DRV-001'}
            required
            className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder={activeTab === 'STUDENT' ? 'John Doe' : 'Driver Name'}
            required
            className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder={activeTab === 'STUDENT' ? 'john@example.com' : 'driver@busit.com'}
            required
            className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
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
          {loading ? <div className="loader border-zinc-900 border-t-zinc-400"></div> : `Register as ${activeTab === 'STUDENT' ? 'Student' : 'Driver'}`}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-400">
        Already have an account? <Link href="/login" className="text-zinc-100 font-medium hover:underline">Sign In</Link>
      </div>
    </div>
  );
}

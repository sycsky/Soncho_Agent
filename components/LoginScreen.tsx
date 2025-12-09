import React, { useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { Agent } from '../types';

// Type for the successful login response data
interface LoginResponse {
  token: string;
  agent: Agent;
}

interface LoginScreenProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@nexus.com');
  const [password, setPassword] = useState('Admin@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      onLoginSuccess(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.05)] border border-white/50 w-full max-w-md relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-600/20 mb-6 transform rotate-3">
            N
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-2 text-center max-w-[260px]">
            Sign in to your NexusSupport Agent Workspace
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3" role="alert">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Login Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Work Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3.5 outline-none transition-all placeholder-gray-400" 
              placeholder="agent@nexushub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3.5 outline-none transition-all placeholder-gray-400" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center">
              <input id="remember-me" type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
              <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-gray-500 cursor-pointer select-none">Remember me</label>
            </div>
            <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-semibold rounded-xl text-sm px-5 py-4 text-center transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              'Sign In to Workspace'
            )}
          </button>
        </form>
        
        <div className="mt-10 flex items-center justify-center gap-2 text-gray-400 text-xs border-t border-gray-100 pt-6">
          <ShieldCheck size={14} className="text-green-500" />
          <span>Secure 256-bit SSL Connection</span>
        </div>
      </div>
    </div>
  );
};
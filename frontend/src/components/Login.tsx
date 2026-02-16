
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

const VALID_USERNAMES = ['otstesting', 'otspely', 'otscica'];
const REQUIRED_PASSWORD = 'Blackcircles';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Artificial delay for feel
    setTimeout(() => {
      if (!VALID_USERNAMES.includes(username.toLowerCase())) {
        setError('Invalid driver username.');
        setIsLoading(false);
      } else if (password !== REQUIRED_PASSWORD) {
        setError('Incorrect password.');
        setIsLoading(false);
      } else {
        onLogin(username.toLowerCase());
      }
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-8 pb-4 flex flex-col items-center">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">RouteMaster</h1>
            <h2 className="text-lg font-bold text-slate-600 mt-1">Driver Portal</h2>
            <p className="text-slate-500 text-sm mt-4 text-center">
              Please sign in to access your daily manifest and route optimization.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. otstesting"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                isLoading 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : "Sign In to RouteMaster"}
            </button>
          </form>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Secure Driver Access</span>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-500 text-xs font-medium">
          RouteMaster Logistics &bull; Powered by Nexus
        </p>
      </div>
    </div>
  );
};

export default Login;

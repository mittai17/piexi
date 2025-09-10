import React, { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { PlexiLogo } from './components/PlexiLogo';
import { GoogleIcon } from './components/GoogleIcon';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
           setMessage('Please check your email for a confirmation link. Be sure to check your spam folder!');
        } else if (data.session) {
           // User is logged in, onAuthStateChange will handle navigation.
           setMessage('Sign up successful! Redirecting...');
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // The onAuthStateChange listener in App.tsx will handle the redirect
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!supabase) {
        setError("Authentication is not configured.");
        return;
    }
    setGoogleLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true, // Prevent auto-redirect to handle iframe scenarios
        },
    });

    if (error) {
        setError(error.message);
        setGoogleLoading(false);
    } else if (data.url) {
        // Manually redirect the top-level window to break out of any iframes.
        // Directly setting `window.top.location.href` can be blocked by restrictive
        // iframe sandboxes. Using `window.open` with `_top` as the target is an
        // alternative way to request navigation of the top-level browsing context.
        window.open(data.url, '_top');
    } else {
        setError("Could not get the Google sign-in URL.");
        setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center w-full p-4 animate-fade-in">
      <div className="bg-gray-900/50 border border-gray-700 rounded-2xl w-full max-w-sm p-8 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <PlexiLogo className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">
            {isSignUp ? 'Create an Account' : 'Welcome to Plexi'}
          </h1>
          <p className="text-gray-400 mt-2">
            {isSignUp ? 'to save your research and bookmarks.' : 'Sign in to continue.'}
          </p>
        </div>
        
        {message ? (
          <p className="my-4 text-center text-green-400 bg-green-900/20 p-3 rounded-md">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full p-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-600"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900/50 px-2 text-gray-500 backdrop-blur-sm">OR</span>
            </div>
        </div>

        <div>
            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full inline-flex justify-center items-center gap-3 py-3 px-4 text-md font-semibold rounded-lg border border-gray-600 bg-gray-800/50 text-gray-200 hover:bg-gray-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {googleLoading ? (
                    'Redirecting...'
                ) : (
                    <>
                        <GoogleIcon className="w-5 h-5" />
                        Sign in with Google
                    </>
                )}
            </button>
        </div>

        {error && <p className="mt-4 text-center text-red-400">{error}</p>}
        
        <div className="mt-6 text-center">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }} className="text-sm text-gray-400 hover:text-purple-400">
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
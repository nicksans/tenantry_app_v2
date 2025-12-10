import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

// Public pages
import Homepage from './components/Homepage';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';

// Protected app layout
import AppLayout from './components/AppLayout';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔐 Initial session check:', { session: session?.user?.email || 'No session', error });
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, { user: session?.user?.email || 'No user' });
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo copy.png" alt="Tenantry Logo" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/auth/sign-up" element={user ? <Navigate to="/app" /> : <SignUp />} />
        <Route path="/auth/sign-in" element={user ? <Navigate to="/app" /> : <SignIn />} />

        {/* Protected Routes */}
        <Route
          path="/app/*"
          element={user ? <AppLayout user={user} /> : <Navigate to="/auth/sign-in" />}
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

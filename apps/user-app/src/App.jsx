import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { initAuth, setUser } from './features/auth/authSlice';
import { supabase } from './services/supabase';
import AppRoutes from './routes/AppRoutes';
import './App.css';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user ?? null));
    });

    const bootstrapAuth = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        const clean = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, '', clean);
      }
      dispatch(initAuth());
    };

    bootstrapAuth();

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;

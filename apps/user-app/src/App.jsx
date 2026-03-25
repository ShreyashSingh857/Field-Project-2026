import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from './services/supabase';
import { setUser } from './features/auth/authSlice';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Rehydrate session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setUser(session?.user ?? null));
    });

    // Listen for login/logout/token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        dispatch(setUser(session?.user ?? null));
      }
    );

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <AppRoutes />;
}

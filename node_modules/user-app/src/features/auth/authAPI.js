import { supabase } from '../../services/supabase';

export const signInWithGoogle = () => supabase.auth.signInWithOAuth({
	provider: 'google',
	options: { redirectTo: `${window.location.origin}/login` },
});

export const signInWithPhone = (phone) => supabase.auth.signInWithOtp({ phone });
export const verifyOtp = (phone, token) => supabase.auth.verifyOtp({ phone, token, type: 'sms' });
export const signOut = () => supabase.auth.signOut();
export const getSession = () => supabase.auth.getSession();

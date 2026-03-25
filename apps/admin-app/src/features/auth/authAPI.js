import supabase from '../../services/supabaseClient';
import bcrypt from 'bcryptjs';

export const loginAdminAPI = async (email, password) => {
    const { data: admin, error } = await supabase
        .from('admins')
        .select('id, name, email, role, jurisdiction_name, password_hash, is_active')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

    if (error || !admin) throw new Error('Invalid email or password');

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) throw new Error('Invalid email or password');

    await supabase
        .from('admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', admin.id);

    const { password_hash, ...safeAdmin } = admin;
    return safeAdmin;
};

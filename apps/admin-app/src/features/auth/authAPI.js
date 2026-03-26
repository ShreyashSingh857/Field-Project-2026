import supabase from '../../services/supabaseClient';
import bcrypt from 'bcryptjs';

export const loginAdminAPI = async (email, password) => {
    const normalizedEmail = email.toLowerCase().trim();
    const rawPassword = password.trim();

    // Try to find existing admin by email
    let { data: admin, error } = await supabase
        .from('admins')
        .select('id, name, email, role, jurisdiction_name, password_hash, is_active')
        .eq('email', normalizedEmail)
        .maybeSingle();

    // If not found and demo credentials are used, auto-provision a demo admin in Supabase
    if (!admin && (!error || (error && error.code === 'PGRST116'))) {
        if (normalizedEmail === 'demo@gramwaste.local' && rawPassword === 'Demo@123456') {
            const passwordHash = await bcrypt.hash(rawPassword, 10);

            const { data: createdAdmin, error: createError } = await supabase
                .from('admins')
                .insert([
                    {
                        name: 'Demo Admin',
                        email: normalizedEmail,
                        password_hash: passwordHash,
                        role: 'panchayat_admin',
                        jurisdiction_name: 'Gokul Nagar',
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select('id, name, email, role, jurisdiction_name, password_hash, is_active')
                .single();

            if (createError) {
                throw new Error(createError.message || 'Failed to create demo admin');
            }

            admin = createdAdmin;
            error = null;
        }
    }

    if (error || !admin) {
        throw new Error('Invalid email or password');
    }

    if (!admin.is_active) {
        throw new Error('Account is inactive');
    }

    const passwordMatch = await bcrypt.compare(rawPassword, admin.password_hash);
    if (!passwordMatch) throw new Error('Invalid email or password');

    await supabase
        .from('admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', admin.id);

    const { password_hash, ...safeAdmin } = admin;
    return safeAdmin;
};

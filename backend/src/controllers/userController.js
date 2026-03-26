import { supabaseAdmin } from '../config/supabase.js';

export async function updateUser(req, res) {
  try {
    const { id } = req.params;

    // Users can only update their own profile
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

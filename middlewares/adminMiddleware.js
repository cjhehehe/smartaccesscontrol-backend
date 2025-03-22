import supabase from '../config/supabase.js';

export const authorizeAdmin = async (req, res, next) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username required for admin verification' });
        }

        const { data: admin, error } = await supabase
            .from('admins')
            .select('id, role')
            .eq('username', username)
            .maybeSingle();

        if (error || !admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        next();
    } catch (error) {
        console.error('❌ Error verifying admin:', error);
        res.status(500).json({ message: 'Server error during admin verification' });
    }
};

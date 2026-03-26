import supabase from "../../services/supabaseClient";
import bcrypt from "bcryptjs";

/**
 * Role hierarchy levels
 * Higher level = higher authority
 * zilla_parishad > block_samiti > gram_panchayat > panchayat_admin
 */
const ROLE_HIERARCHY = {
    zilla_parishad: 4,
    block_samiti: 3,
    gram_panchayat: 2,
    panchayat_admin: 1,
};

/**
 * Validate role hierarchy - user can only create/manage lower roles
 * @param {string} creatorRole - Role of the user creating
 * @param {string} targetRole - Role being created/managed
 * @returns {boolean} Whether allowed
 */
const validateRoleHierarchy = (creatorRole, targetRole) => {
    const creatorLevel = ROLE_HIERARCHY[creatorRole];
    const targetLevel = ROLE_HIERARCHY[targetRole];

    if (!creatorLevel || !targetLevel) {
        return false;
    }

    return creatorLevel > targetLevel;
};

/**
 * Fetch all sub-admins under a parent admin
 * @param {string} adminId - Parent admin ID
 * @param {string} adminRole - Parent admin's role
 * @returns {Promise<Array>} List of sub-admins
 */
export const fetchSubAdmins = async (adminId, adminRole) => {
    try {
        let query = supabase
            .from("admins")
            .select(
                `id,
         name,
         email,
         role,
         jurisdiction_name,
         jurisdiction_id,
         is_active,
         created_at,
         parent_admin_id`
            );

        // Filter for sub-admins under this admin
        query = query.eq("parent_admin_id", adminId);

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;

        // Filter by role hierarchy - only return admins of lower roles
        const filteredData = data.filter(
            (admin) =>
                validateRoleHierarchy(adminRole, admin.role) || admin.role === adminRole
        );

        return filteredData || [];
    } catch (error) {
        console.error("Error fetching sub-admins:", error);
        throw new Error(`Failed to fetch sub-admins: ${error.message}`);
    }
};

/**
 * Create a new sub-admin
 * @param {Object} subAdminData - Sub-admin details: {name, email, role, jurisdiction_name}
 * @param {string} parentAdminId - Parent admin ID
 * @param {string} parentAdminRole - Parent admin's role
 * @returns {Promise<Object>} Created sub-admin with temp password
 */
export const createSubAdmin = async (
    subAdminData,
    parentAdminId,
    parentAdminRole
) => {
    try {
        // Validate role hierarchy
        if (!validateRoleHierarchy(parentAdminRole, subAdminData.role)) {
            throw new Error(
                `Cannot create admin with role ${subAdminData.role} under ${parentAdminRole}`
            );
        }

        // Generate temporary password
        const tempPassword = Math.random()
            .toString(36)
            .substring(2, 10)
            .toUpperCase();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const { data, error } = await supabase
            .from("admins")
            .insert([
                {
                    name: subAdminData.name,
                    email: subAdminData.email.toLowerCase(),
                    password_hash: passwordHash,
                    role: subAdminData.role,
                    jurisdiction_name: subAdminData.jurisdiction_name,
                    parent_admin_id: parentAdminId,
                    is_active: true,
                    created_by: parentAdminId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;

        // Remove sensitive data before returning
        const { password_hash, ...safeAdmin } = data;

        return {
            ...safeAdmin,
            temp_password: tempPassword,
            note: "Share this temporary password with the admin. They must change it on first login.",
        };
    } catch (error) {
        console.error("Error creating sub-admin:", error);
        throw new Error(`Failed to create sub-admin: ${error.message}`);
    }
};

/**
 * Deactivate a sub-admin
 * @param {string} subAdminId - Sub-admin ID
 * @returns {Promise<Object>} Updated admin
 */
export const deactivateSubAdmin = async (subAdminId) => {
    try {
        const { data, error } = await supabase
            .from("admins")
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq("id", subAdminId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("Error deactivating sub-admin:", error);
        throw new Error(`Failed to deactivate sub-admin: ${error.message}`);
    }
};

/**
 * Get hierarchy tree - all admins under a parent admin
 * @param {string} adminId - Admin ID
 * @param {string} adminRole - Admin's role
 * @returns {Promise<Object>} Hierarchical tree structure
 */
export const getHierarchyTree = async (adminId, adminRole) => {
    try {
        // Get direct sub-admins
        const subAdmins = await fetchSubAdmins(adminId, adminRole);

        // Build tree structure
        const tree = {
            id: adminId,
            role: adminRole,
            children: subAdmins.map((admin) => ({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                jurisdiction_name: admin.jurisdiction_name,
                is_active: admin.is_active,
            })),
        };

        return tree;
    } catch (error) {
        console.error("Error getting hierarchy tree:", error);
        throw new Error(`Failed to get hierarchy tree: ${error.message}`);
    }
};

/**
 * Update sub-admin details
 * @param {string} subAdminId - Sub-admin ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated admin
 */
export const updateSubAdmin = async (subAdminId, updates) => {
    try {
        const safupdates = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        // Remove sensitive fields if present
        delete safupdates.password_hash;
        delete safupdates.id;
        delete safupdates.role; // Role shouldn't be changed

        const { data, error } = await supabase
            .from("admins")
            .update(safupdates)
            .eq("id", subAdminId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating sub-admin:", error);
        throw new Error(`Failed to update sub-admin: ${error.message}`);
    }
};

/**
 * Get admin by ID
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Admin details
 */
export const getSubAdminById = async (adminId) => {
    try {
        const { data, error } = await supabase
            .from("admins")
            .select(
                `id,
         name,
         email,
         role,
         jurisdiction_name,
         jurisdiction_id,
         is_active,
         created_at,
         parent_admin_id`
            )
            .eq("id", adminId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching admin:", error);
        throw new Error(`Failed to fetch admin: ${error.message}`);
    }
};

/**
 * Get role hierarchy level
 * @param {string} role - Role name
 * @returns {number} Hierarchy level
 */
export const getRoleHierarchyLevel = (role) => {
    return ROLE_HIERARCHY[role] || 0;
};

/**
 * Check if role can manage another role
 * @param {string} managerRole - Manager's role
 * @param {string} targetRole - Target role
 * @returns {boolean} Whether allowed to manage
 */
export const canManageRole = (managerRole, targetRole) => {
    return validateRoleHierarchy(managerRole, targetRole);
};

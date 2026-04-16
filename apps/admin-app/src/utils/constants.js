// Task Types
export const TASK_TYPES = [
    { value: 'bin_clean', label: 'Bin Cleanup' },
    { value: 'litter_pickup', label: 'Litter Pickup' },
    { value: 'drain_clearance', label: 'Drain Clearance' },
    { value: 'other', label: 'Other' },
];

// Task Status
export const TASK_STATUS = [
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
];

// Priority Levels
export const PRIORITIES = [
    { value: 1, label: 'Urgent' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Low' },
];

// Admin Roles
export const ADMIN_ROLES = {
    zilla_parishad: 'Zilla Parishad',
    block_samiti: 'Block Samiti',
    gram_panchayat: 'Gram Panchayat',
    ward_member: 'Ward Member',
};

// Issue Status
export const ISSUE_STATUS = [
    { value: 'open', label: 'Open' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' },
];

// Bin Fill Status
export const BIN_FILL_STATUS = [
    { value: 'empty', label: 'Empty' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'full', label: 'Full' },
    { value: 'overflow', label: 'Overflow' },
];

// Extended mappings
export const ROLE_LABELS = {
    zilla_parishad: 'Zilla Parishad',
    block_samiti: 'Block Samiti',
    gram_panchayat: 'Gram Panchayat',
    ward_member: 'Ward Member',
};

export const TASK_TYPE_LABELS = {
    bin_clean: 'Bin Cleanup',
    litter_pickup: 'Litter Pickup',
    drain_clearance: 'Drain Clearance',
    other: 'Other',
};

export const STATUS_BADGE_CLASS = {
    done: 'done',
    completed: 'done',
    pending: 'pending',
    in_progress: 'pending',
    assigned: 'info',
    cancelled: 'muted',
    open: 'pending',
    resolved: 'done',
    rejected: 'muted',
    urgent: 'urgent',
    active: 'active',
};

export const PRIORITY_LABELS = { 1: 'Urgent', 2: 'Normal', 3: 'Low' };
export const PRIORITY_COLORS = { 1: '#A32D2D', 2: '#854F0B', 3: '#3B6D11' };

export const FILL_STATUS_COLOR = {
    empty: '#A5D6A7',
    low: '#66BB6A',
    medium: '#FFA726',
    high: '#FF7043',
    full: '#E53935',
    overflow: '#7B1FA2',
};

export const CHILD_ROLE = {
    zilla_parishad: 'block_samiti',
    block_samiti: 'gram_panchayat',
    gram_panchayat: 'ward_member',
};

export const formatDate = (iso) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
};

export const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
};

export const daysOverdue = (dueAt) => {
    const diff = new Date() - new Date(dueAt);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Default API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Date Format Options
export const DATE_FORMAT_OPTIONS = {
    en: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    },
    en_IN: {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    },
};

export const DEMO_CREDENTIALS = {
  zilla_parishad: {
    email:    'zillaparishad@demo.gramwaste.local',
    password: 'Demo@123456',
    label:    'Zilla Parishad (District)',
    color:    '#880E4F',
  },
  block_samiti: {
    email:    'blocksamiti@demo.gramwaste.local',
    password: 'Demo@123456',
    label:    'Block Samiti (Block)',
    color:    '#F57F17',
  },
  gram_panchayat: {
    email:    'grampanchayat@demo.gramwaste.local',
    password: 'Demo@123456',
    label:    'Gram Panchayat (Village)',
    color:    '#1565C0',
  },
  ward_member: {
    email:    'wardmember@demo.gramwaste.local',
    password: 'Demo@123456',
    label:    'Ward Member (Ward)',
    color:    '#2E7D32',
  },
};

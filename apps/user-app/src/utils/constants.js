export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const ISSUE_TYPES = [
	{ value: 'overflowing_bin', label: 'Overflowing Bin' },
	{ value: 'illegal_dumping', label: 'Illegal Dumping' },
	{ value: 'drain_blockage', label: 'Drain Blockage' },
	{ value: 'other', label: 'Other' },
];

export const BIN_FILL_STATUS_LABELS = {
	empty: 'Empty',
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	full: 'Full',
	overflow: 'Overflow',
};

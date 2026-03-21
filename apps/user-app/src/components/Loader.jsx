import { Loader2 } from 'lucide-react';

export default function Loader({ message = 'Loading...' }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--clay-bg)' }}>
			<div className="clay-icon flex h-16 w-16 items-center justify-center" style={{ backgroundColor: 'var(--clay-card)', color: 'var(--clay-primary)' }}>
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
			<p className="text-sm font-medium" style={{ color: 'var(--clay-muted)' }}>{message}</p>
		</div>
	);
}

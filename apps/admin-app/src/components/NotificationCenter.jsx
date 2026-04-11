import { useEffect, useMemo, useState } from 'react';
import { Bell, X } from 'lucide-react';
import api from '../services/axiosInstance';

const KEY = 'gwc-admin-seen-notifications';

export default function NotificationCenter() {
	const [items, setItems] = useState([]);
	const [open, setOpen] = useState(false);
	const [toasts, setToasts] = useState([]);
	const seen = useMemo(() => new Set(JSON.parse(localStorage.getItem(KEY) || '[]')), []);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const { data } = await api.get('/notifications');
				if (!mounted) return;
				const next = (data.notifications || []).slice(0, 12);
				setItems(next);
				const fresh = next.filter((item) => !seen.has(item.id));
				if (fresh.length) {
					localStorage.setItem(KEY, JSON.stringify([...seen, ...fresh.map((item) => item.id)]));
					setToasts((list) => [...list, ...fresh.slice(0, 3)].slice(-3));
					fresh.slice(0, 3).forEach((item) => {
						if (Notification.permission === 'granted') new Notification(item.title, { body: item.body });
					});
				}
			} catch (_e) {}
		};
		load();
		const id = setInterval(load, 60000);
		return () => { mounted = false; clearInterval(id); };
	}, [seen]);

	const unread = Math.max(0, items.length - seen.size);

	return (
		<>
			<div style={{ position: 'relative' }}>
				<button
					type="button"
					onClick={async () => { if (Notification.permission === 'default') await Notification.requestPermission(); setOpen((v) => !v); }}
					style={{
						position: 'relative',
						background: 'transparent',
						border: '1px solid var(--admin-border)',
						borderRadius: '999px',
						width: '42px',
						height: '42px',
						cursor: 'pointer',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: '#fff',
					}}
					aria-label="Notifications"
				>
					<Bell size={18} />
					{unread > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#D32F2F', color: '#fff', borderRadius: '999px', fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>{unread}</span>}
				</button>
				{open && (
					<div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '360px', maxWidth: '90vw', background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', zIndex: 1200, overflow: 'hidden' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--admin-border)' }}>
							<strong style={{ fontSize: '14px' }}>Notifications</strong>
							<button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
						</div>
						<div style={{ maxHeight: '360px', overflowY: 'auto' }}>
							{items.length === 0 ? <div style={{ padding: '14px', fontSize: '13px', color: 'var(--admin-muted)' }}>No notifications yet.</div> : items.map((item) => <button key={item.id} type="button" onClick={() => { setOpen(false); window.location.assign(item.link || '/dashboard'); }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '12px 14px', borderBottom: '1px solid var(--admin-border)', cursor: 'pointer' }}><div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: 'var(--admin-text)' }}>{item.title}</div><div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{item.body}</div></button>)}
						</div>
					</div>
				)}
			</div>
			<div style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 1300, display: 'grid', gap: '8px' }}>
				{toasts.map((item, idx) => <div key={`${item.id}-${idx}`} style={{ background: '#111827', color: '#fff', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 10px 22px rgba(0,0,0,0.2)', width: '300px', maxWidth: 'calc(100vw - 32px)' }}><div style={{ fontSize: '13px', fontWeight: 700 }}>{item.title}</div><div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.85 }}>{item.body}</div></div>)}
			</div>
		</>
	);
}
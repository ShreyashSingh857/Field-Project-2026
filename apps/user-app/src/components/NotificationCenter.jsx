import { useEffect, useMemo, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../services/axiosInstance';

const KEY = 'gwc-user-seen-notifications';

function formatTime(value) {
	const ts = new Date(value).getTime();
	if (!Number.isFinite(ts)) return '';
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationCenter() {
	const user = useSelector((s) => s.auth.user);
	const [items, setItems] = useState([]);
	const [open, setOpen] = useState(false);
	const [toasts, setToasts] = useState([]);

	const seen = useMemo(() => new Set(JSON.parse(localStorage.getItem(KEY) || '[]')), []);

	useEffect(() => {
		let mounted = true;
		const pushToast = (item) => setToasts((list) => [...list, { ...item, key: `${item.id}-${Date.now()}` }].slice(-3));
		const showBrowser = (item) => {
			if (Notification.permission === 'granted') new Notification(item.title, { body: item.body });
		};
		const load = async () => {
			try {
				const { data } = await api.get('/notifications');
				if (!mounted) return;
				const next = (data.notifications || []).slice(0, 12);
				setItems(next);
				const newItems = next.filter((item) => !seen.has(item.id));
				if (newItems.length) {
					localStorage.setItem(KEY, JSON.stringify([...seen, ...newItems.map((item) => item.id)]));
					newItems.slice(0, 3).forEach((item) => { pushToast(item); showBrowser(item); });
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
			<div className="fixed right-4 top-24 z-40 sm:right-5 sm:top-28">
				<button type="button" onClick={async () => { if (Notification.permission === 'default') await Notification.requestPermission(); setOpen((v) => !v); }} className="clay-btn-round relative inline-flex h-11 w-11 items-center justify-center bg-white text-black shadow-lg" aria-label="Notifications">
					<Bell className="h-4 w-4" />
					{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
				</button>
				{open && (
					<div className="absolute right-0 top-full z-50 mt-2 w-[min(88vw,18rem)] max-h-[55vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:w-80 sm:max-h-96">
						<div className="flex items-center justify-between border-b px-4 py-3"><strong className="text-sm">Notifications</strong><button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div>
						<div className="max-h-[calc(55vh-48px)] overflow-y-auto sm:max-h-96">
							{items.length === 0 ? <div className="p-4 text-sm text-gray-500">No notifications yet.</div> : items.map((item) => <button key={item.id} type="button" onClick={() => { setOpen(false); window.location.assign(item.link || '/dashboard'); }} className="block w-full border-b px-4 py-3 text-left hover:bg-gray-50"><div className="wrap-break-word text-sm font-semibold text-black">{item.title}</div><div className="mt-1 wrap-break-word text-xs text-gray-600">{item.body}</div><div className="mt-1 text-[11px] text-gray-500">{formatTime(item.created_at || item.createdAt)}</div></button>)}
						</div>
					</div>
				)}
			</div>
			<div className="fixed left-4 top-4 z-50 space-y-2">
				{toasts.map((t) => <div key={t.key} className="w-72 rounded-2xl bg-black/90 p-3 text-white shadow-xl"><div className="text-sm font-semibold">{t.title}</div><div className="mt-1 text-xs text-white/80">{t.body}</div></div>)}
			</div>
		</>
	);
}
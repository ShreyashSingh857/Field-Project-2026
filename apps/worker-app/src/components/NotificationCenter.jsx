import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../services/axiosInstance';
import { supabase } from '../services/supabaseClient';

export default function NotificationCenter() {
	const worker = useSelector((s) => s.auth.worker);
	const [items, setItems] = useState([]);
	const [open, setOpen] = useState(false);
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		if (!worker?.id) return;
		let mounted = true;
		let channel = null;
		const show = (item) => { if (Notification.permission === 'granted') new Notification(item.title, { body: item.body }); };
		const load = async () => {
			try {
				const { data } = await api.get('/notifications');
				if (!mounted) return;
				const next = (data.notifications || []).slice(0, 12);
				setItems(next);
			} catch (_e) {}
		};

		const handleRealtime = (payload) => {
			if (payload?.new?.actor_id !== worker.id) return;
			setToasts((list) => [...list, payload.new].slice(-3));
			show(payload.new);
			load();
		};

		load();
		const id = setInterval(load, 60000);
		if (supabase) {
			channel = supabase
				.channel(`worker-notifications-${worker.id}`)
				.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'actor_type=eq.worker' }, handleRealtime)
				.subscribe();
		}

		return () => {
			mounted = false;
			clearInterval(id);
			if (channel && supabase) supabase.removeChannel(channel);
		};
	}, [worker?.id]);

	const unread = items.filter((item) => !item.read).length;

	const openItem = async (item) => {
		try {
			if (!item.read) {
				await api.patch(`/notifications/${item.id}/read`);
				setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
			}
		} catch (_e) {}
		setOpen(false);
		window.location.assign(item.link || '/');
	};

	return (
		<>
			<div className="fixed right-4 top-4 z-50">
				<button type="button" onClick={async () => { if (Notification.permission === 'default') await Notification.requestPermission(); setOpen((v) => !v); }} className="rounded-full bg-white p-3 shadow-lg ring-1 ring-black/5" aria-label="Notifications">
					<Bell className="h-5 w-5 text-black" />
					{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
				</button>
				{open && (
					<div className="mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
						<div className="flex items-center justify-between border-b px-4 py-3"><strong className="text-sm">Notifications</strong><button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div>
						<div className="max-h-96 overflow-y-auto">
							{items.length === 0 ? <div className="p-4 text-sm text-gray-500">No notifications yet.</div> : items.map((item) => <button key={item.id} type="button" onClick={() => openItem(item)} className={`block w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${item.read ? '' : 'bg-emerald-50/40'}`}><div className="text-xs font-bold uppercase tracking-wide text-emerald-600">{item.kind === 'task_assigned' ? 'Task assigned' : item.kind}</div><div className="text-sm font-semibold text-black">{item.title}</div><div className="mt-1 text-xs text-gray-600">{item.body}</div></button>)}
						</div>
					</div>
				)}
			</div>
			<div className="fixed left-4 top-4 z-50 space-y-2">
				{toasts.map((t) => <div key={t.id} className="w-72 rounded-2xl bg-black/90 p-3 text-white shadow-xl"><div className="text-sm font-semibold">{t.title}</div><div className="mt-1 text-xs text-white/80">{t.body}</div></div>)}
			</div>
		</>
	);
}
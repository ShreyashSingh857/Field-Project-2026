import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ClipboardList, Edit3, Languages, LogOut, MapPin, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logout } from '../features/auth/authSlice';

export default function Profile() {
	const { t, i18n } = useTranslation();
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const user = useSelector((s) => s.auth.user);
	const baseName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'User';
	const [name, setName] = useState(baseName);
	const [editing, setEditing] = useState(false);
	const initials = useMemo(() => name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase(), [name]);
	const langs = [{ k: 'en', l: 'English' }, { k: 'hi', l: 'हिंदी' }, { k: 'mr', l: 'मराठी' }];

	return (
		<div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
			<div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>
				<header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
					<button type="button" onClick={() => navigate(-1)} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
					<div className="flex items-center gap-2"><div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}><img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" /></div><div><p className="text-sm font-bold text-black sm:text-base">{t('profile.title', { defaultValue: 'My Profile' })}</p></div></div>
				</header>

				<main className="mx-auto max-w-md space-y-3 px-4 py-6 pb-24">
					<section className="clay-card p-5 text-center">
						<div className="mx-auto clay-icon mb-3 flex h-20 w-20 items-center justify-center" style={{ backgroundColor: 'var(--clay-card)' }}><span className="text-2xl font-bold" style={{ color: 'var(--clay-primary)' }}>{initials}</span></div>
						{!editing ? <div className="inline-flex items-center gap-2"><p className="text-xl font-bold text-black">{name}</p><button onClick={() => setEditing(true)} className="clay-btn-round inline-flex h-7 w-7 items-center justify-center"><Edit3 className="h-3 w-3" /></button></div> : <div className="mx-auto flex max-w-xs items-center gap-2"><input className="clay-lang-box w-full px-3 py-2 text-sm text-black outline-none" value={name} onChange={(e) => setName(e.target.value)} /><button className="rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }} onClick={() => setEditing(false)}>{t('profile.saveName', { defaultValue: 'Save' })}</button></div>}
						<p className="mt-2 text-sm" style={{ color: 'var(--clay-muted)' }}>{user?.phone || user?.user_metadata?.phone || '-'}</p>
						<p className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--clay-muted)' }}><MapPin className="h-3 w-3" />{user?.user_metadata?.village_name || 'Village'}</p>
					</section>

					<section className="clay-card p-4">
						<p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-black"><Languages className="h-4 w-4" />{t('profile.language', { defaultValue: 'Language' })}</p>
						<div className="flex gap-2">{langs.map((x) => <button key={x.k} onClick={() => i18n.changeLanguage(x.k)} className="flex-1 rounded-full px-3 py-2 text-xs font-semibold" style={i18n.language === x.k ? { color: '#fff', background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' } : { color: 'var(--clay-text)', backgroundColor: 'var(--clay-card)', boxShadow: 'var(--clay-shadow)' }}>{x.l}</button>)}</div>
					</section>

					<section className="clay-card p-3 space-y-2">
						<button onClick={() => navigate('/marketplace?mine=true')} className="clay-nav-item flex w-full items-center justify-between px-3 py-2 text-sm text-black"><span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4" />{t('profile.myListings', { defaultValue: 'My Listings' })}</span><ChevronRight className="h-4 w-4" /></button>
						<button onClick={() => navigate('/report?mine=true')} className="clay-nav-item flex w-full items-center justify-between px-3 py-2 text-sm text-black"><span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" />{t('profile.myReports', { defaultValue: 'My Reports' })}</span><ChevronRight className="h-4 w-4" /></button>
					</section>

					<button onClick={async () => { await dispatch(logout()); navigate('/'); }} className="w-full rounded-2xl py-3 text-sm font-semibold" style={{ border: '1.5px solid #FFCDD2', color: '#C62828', backgroundColor: 'var(--clay-card)' }}><span className="inline-flex items-center gap-2"><LogOut className="h-4 w-4" />{t('profile.logout', { defaultValue: 'Logout' })}</span></button>
				</main>
			</div>
		</div>
	);
}

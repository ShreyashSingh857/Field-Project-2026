import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import api from '../services/axiosInstance';

const timeAgo = (d) => {
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `${Math.max(h, 1)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function WasteTipsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const villageId = user?.user_metadata?.village_id || user?.village_id;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState({});

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await api.get(`/announcements?village_id=${villageId || ''}`);
        setItems((data.announcements || []).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.created_at) - new Date(a.created_at)));
      } finally { setLoading(false); }
    };
    run();
  }, [villageId]);

  const cards = useMemo(() => items.map((i) => ({ ...i, long: (i.content || '').length > 180 })), [items]);

  return <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}><div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>
    <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4"><button type="button" onClick={() => navigate(-1)} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button><div className="flex items-center gap-2"><div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}><img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" /></div><div><p className="text-sm font-bold text-black sm:text-base">{t('wasteTips.title')}</p><p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>{t('wasteTips.subtitle')}</p></div></div></header>
    <main className="mx-auto max-w-2xl px-4 py-4 pb-24 space-y-3">
      {loading && [1,2,3].map((k)=><div key={k} className="clay-card animate-pulse p-4 h-28" />)}
      {!loading && cards.length===0 && <div className="py-14 text-center"><div className="mx-auto clay-icon mb-3 flex h-12 w-12 items-center justify-center" style={{ backgroundColor: 'var(--clay-card)', color: 'var(--clay-primary)' }}><Leaf className="h-6 w-6" /></div><p className="text-sm font-bold text-black">{t('wasteTips.empty')}</p><p className="mt-1 text-xs" style={{ color: 'var(--clay-muted)' }}>{t('wasteTips.emptySubtitle')}</p></div>}
      {!loading && cards.map((a)=><article key={a.id} className="clay-card p-4 relative"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-black sm:text-base">{a.title}</h3>{a.is_pinned && <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: '#FFF8E1', color: '#F57F17' }}>📌 {t('wasteTips.pinned')}</span>}</div><p className={`mt-2 text-xs leading-5 sm:text-sm ${open[a.id] ? '' : 'line-clamp-4'}`} style={{ color: 'var(--clay-muted)' }}>{a.content}</p>{a.long && <button type="button" onClick={()=>setOpen((s)=>({ ...s, [a.id]: !s[a.id] }))} className="mt-1 text-xs font-medium" style={{ color: 'var(--clay-primary)' }}>{open[a.id] ? t('wasteTips.showLess') : t('wasteTips.readMore')}</button>}<div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--clay-muted)' }}><span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{a.admin?.name || 'Admin'} · {a.admin?.role || 'Panchayat'}</span><span>{timeAgo(a.created_at)}</span></div></article>)}
    </main></div></div>;
}

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowLeft, Clock, MapPin, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchBinById } from '../features/bins/binSlice';
import Loader from '../components/Loader';

const S = { empty:{bg:'#E8F5E9',c:'#2E7D32',l:'Empty'},low:{bg:'#F1F8E9',c:'#558B2F',l:'Low'},medium:{bg:'#FFF8E1',c:'#F57F17',l:'Medium'},high:{bg:'#FFF3E0',c:'#E65100',l:'High'},full:{bg:'#FFEBEE',c:'#C62828',l:'Full'},overflow:{bg:'#FFCDD2',c:'#B71C1C',l:'Overflow'} };

export default function BinDetails(){
	const { t } = useTranslation(); const n = useNavigate(); const { id } = useParams(); const d = useDispatch();
	const { selectedBin:b, loading, error } = useSelector((s)=>s.bins); useEffect(()=>{ if(id) d(fetchBinById(id)); },[d,id]);
	if(loading && !b) return <Loader />;
	const f = Math.max(0, Math.min(100, Number(b?.fill_level || 0))); const s = S[b?.fill_status] || S.medium;
	const rows = [[MapPin,t('binDetails.location',{defaultValue:'Location'}),b?.location_address||'-'],[Trash2,t('binDetails.binId',{defaultValue:'Bin ID'}),b?.id||id],[Activity,t('binDetails.status',{defaultValue:'Status'}),s.l],[Clock,t('binDetails.lastUpdated',{defaultValue:'Last Sensor Update'}),b?.last_sensor_update||'-']];
	return <div className="min-h-screen text-black" style={{backgroundColor:'var(--clay-bg)'}}><div className="relative min-h-screen w-full" style={{backgroundColor:'var(--clay-bg)'}}>
		<header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4"><button type="button" onClick={()=>n(-1)} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Go back"><ArrowLeft className="h-5 w-5"/></button><div className="flex items-center gap-2"><div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{backgroundColor:'#fff'}}><img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain"/></div><div><p className="text-sm font-bold text-black sm:text-base">{b?.label||'Bin'}</p><p className="text-xs sm:text-sm" style={{color:'var(--clay-muted)'}}>{b?.location_address||'-'}</p></div></div></header>
		<main className="mx-auto max-w-md space-y-4 px-4 py-4 pb-24"><div className="clay-card p-4 text-center"><div className="mx-auto relative h-[120px] w-[120px]"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--clay-card)" strokeWidth="10"/><circle cx="60" cy="60" r="54" fill="none" stroke={s.c} strokeWidth="10" strokeLinecap="round" strokeDasharray="339" strokeDashoffset={339*(1-f/100)} transform="rotate(-90 60 60)" style={{transition:'stroke-dashoffset .8s ease'}}/></svg><div className="absolute inset-0 grid place-items-center"><div><p className="text-xl font-bold text-black">{f}%</p><p className="text-xs" style={{color:s.c}}>{s.l}</p></div></div></div><p className="mt-3 inline-flex items-center gap-1 text-xs" style={{color:'var(--clay-muted)'}}><Clock className="h-3 w-3"/>{t('binDetails.lastUpdated',{defaultValue:'Last updated'})}</p></div>
		<div className="clay-card space-y-2 p-3">{rows.map(([I,l,v])=><div key={l} className="flex items-center justify-between rounded-2xl px-3 py-2" style={{backgroundColor:'var(--clay-bg)',boxShadow:'inset 0 1px 3px rgba(0,0,0,0.06)'}}><div className="flex items-center gap-2"><I className="h-4 w-4" style={{color:'var(--clay-primary)'}}/><p className="text-xs font-medium text-black">{l}</p></div>{l===t('binDetails.status',{defaultValue:'Status'})?<span className="rounded-full px-2 py-0.5 text-xs" style={{backgroundColor:s.bg,color:s.c}}>{v}</span>:<p className="max-w-[50%] truncate text-xs" style={{color:'var(--clay-muted)'}}>{v}</p>}</div>)}</div>
		{(b?.fill_status==='full'||b?.fill_status==='overflow')&&<button type="button" onClick={()=>n(`/report?bin_id=${id}&location=${encodeURIComponent(b?.location_address||'')}`)} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white" style={{background:'linear-gradient(135deg,#C62828,#E53935)'}}><AlertTriangle className="h-4 w-4"/>{t('binDetails.reportOverflow',{defaultValue:'Report Overflow'})}</button>}
		{error&&<div className="clay-card p-3 text-xs text-black">{error}</div>}</main></div></div>;
}

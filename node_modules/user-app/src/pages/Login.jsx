import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Globe, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { signInWithGoogle, signInWithPhone, verifyOtp } from '../features/auth/authAPI';

const languageOptions = [
	{ value: 'en', label: 'English' },
	{ value: 'hi', label: 'हिंदी' },
	{ value: 'mr', label: 'मराठी' },
];

export default function Login() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const user = useSelector((state) => state.auth.user);
	const [phase, setPhase] = useState('phone');
	const [phone, setPhone] = useState('');
	const [otp, setOtp] = useState(['', '', '', '', '', '']);
	const [error, setError] = useState(null);

	useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);
	const otpValue = useMemo(() => otp.join(''), [otp]);

	const onGoogle = async () => {
		setError(null);
		setPhase('loading');
		const { error: authError } = await signInWithGoogle();
		if (authError) {
			setError(t('login.error.generic'));
			setPhase('phone');
		}
	};

	const onSendOtp = async () => {
		if (!/^\d{10}$/.test(phone)) return setError(t('login.error.invalidPhone'));
		setError(null);
		setPhase('loading');
		const { error: authError } = await signInWithPhone(`+91${phone}`);
		if (authError) {
			setError(t('login.error.generic'));
			setPhase('phone');
			return;
		}
		setPhase('otp');
	};

	const onVerify = async () => {
		if (!/^\d{6}$/.test(otpValue)) return setError(t('login.error.invalidOtp'));
		setError(null);
		setPhase('loading');
		const { error: authError } = await verifyOtp(`+91${phone}`, otpValue);
		if (authError) {
			setError(t('login.error.invalidOtp'));
			setPhase('otp');
			return;
		}
		navigate('/dashboard');
	};

	return (
		<div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
			<div className="relative min-h-screen w-full flex items-center justify-center px-4" style={{ backgroundColor: 'var(--clay-bg)' }}>
				<div className="w-full max-w-[400px] clay-card p-8 space-y-4">
					<div className="mx-auto clay-icon flex h-14 w-14 items-center justify-center" style={{ backgroundColor: '#fff' }}><img src="/Logo.png" alt="GramWaste Connect" className="h-10 w-10 object-contain" /></div>
					<h1 className="text-center text-xl font-bold text-black">{t('login.title')}</h1>
					<p className="text-center text-sm" style={{ color: 'var(--clay-muted)' }}>{t('login.subtitle')}</p>
					<div className="h-px" style={{ backgroundColor: 'var(--clay-card)' }} />
					<button type="button" onClick={onGoogle} className="w-full h-[52px] clay-card flex items-center justify-center gap-2 text-black font-medium" disabled={phase === 'loading'}><Globe className="h-5 w-5" />{t('login.googleBtn')}</button>
					<div className="flex items-center gap-2"><div className="h-px flex-1" style={{ backgroundColor: 'var(--clay-card)' }} /><span className="text-xs" style={{ color: 'var(--clay-muted)' }}>{t('login.orDivider')}</span><div className="h-px flex-1" style={{ backgroundColor: 'var(--clay-card)' }} /></div>
					<div className="clay-lang-box flex items-center gap-2 h-[52px] px-3"><Phone className="h-5 w-5" /><span>🇮🇳 +91</span><input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={t('login.phonePlaceholder')} className="bg-transparent outline-none w-full text-black" /></div>
					{phase === 'otp' && <div className="space-y-2"><p className="text-sm font-medium text-black">{t('login.otpLabel')}</p><div className="flex gap-2">{otp.map((digit, i) => <input key={i} value={digit} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(-1); const next = [...otp]; next[i] = val; setOtp(next); }} className="clay-lang-box h-11 w-11 text-center text-black" maxLength={1} />)}</div></div>}
					<button type="button" onClick={phase === 'otp' ? onVerify : onSendOtp} className="w-full h-[52px] rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }} disabled={phase === 'loading'}>{phase === 'otp' ? <CheckCircle2 className="h-5 w-5" /> : null}{phase === 'otp' ? t('login.verifyBtn') : t('login.sendOtpBtn')}</button>
					{error && <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}><AlertCircle className="h-4 w-4" /><p className="text-xs">{error}</p></div>}
					<div className="pt-1"><div className="clay-lang-box px-3 py-2"><select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} className="w-full bg-transparent text-black outline-none">{languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div>
				</div>
			</div>
		</div>
	);
}

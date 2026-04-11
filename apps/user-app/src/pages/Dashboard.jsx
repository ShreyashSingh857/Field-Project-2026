import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
	AlertTriangle,
	Camera,
	CircleHelp,
	Languages,
	Leaf,
	LogOut,
	MapPin,
	Menu,
	MessageCircle,
	Recycle,
	Settings,
	User,
	X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from '../features/auth/authSlice';

const LOGO_SRC = "/Logo.png";

const languageOptions = [
	{ value: "en", label: "English" },
	{ value: "hi", label: "हिंदी" },
	{ value: "mr", label: "मराठी" },
];

export default function Dashboard() {
	const dispatch = useDispatch();
	const { t, i18n } = useTranslation();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const navigate = useNavigate();

	const user = useSelector((s) => s.auth.user);
	const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || '';
	const villageName = user?.user_metadata?.village_name || '';

	const cards = useMemo(
		() => [
			{
				key: "announcements",
				icon: MessageCircle,
				title: "Announcements",
				description: "View admin announcements and alerts.",
				route: "/announcements",
			},
			{
				key: "nearbyBins",
				icon: MapPin,
				title: t("cards.nearbyBins.title"),
				description: t("cards.nearbyBins.description"),
				route: "/bins",
			},
			{
				key: "aiScanner",
				icon: Camera,
				title: t("cards.aiScanner.title"),
				description: t("cards.aiScanner.description"),
				route: "/ai-scanner",
			},
			{
				key: "marketplace",
				icon: Recycle,
				title: t("cards.marketplace.title"),
				description: t("cards.marketplace.description"),
				route: "/marketplace",
			},
			{
				key: "reportIssue",
				icon: AlertTriangle,
				title: t("cards.reportIssue.title"),
				description: t("cards.reportIssue.description"),
				route: "/report",
			},
		],
		[t],
	);

	const menuItems = useMemo(
		() => [
			{ key: "profile", icon: User, label: t("menu.profile") },
			{ key: "settings", icon: Settings, label: t("menu.settings") },
			{ key: "help", icon: CircleHelp, label: t("menu.help") },
			{ key: "logout", icon: LogOut, label: t("menu.logout") },
		],
		[t],
	);

	const changeLanguage = event => {
		i18n.changeLanguage(event.target.value);
	};

	return (
		<div className="min-h-screen text-black" style={{ backgroundColor: "var(--clay-bg)" }}>
			<div className="relative min-h-screen w-full" style={{ backgroundColor: "var(--clay-bg)" }}>

				{/* ── Clay Header ── */}
				<header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
					{/* Hamburger — raised clay round button */}
					<button
						type="button"
						onClick={() => setDrawerOpen(true)}
						className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black"
						aria-label="Open menu"
					>
						<Menu className="h-5 w-5" />
					</button>

					{/* Logo + App name */}
					<div className="flex items-center gap-2">
						{/* Logo image inside a white clay circle */}
						<div
							className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden"
							style={{ backgroundColor: "#fff" }}
						>
							<img
								src={LOGO_SRC}
								alt="GramWaste Connect logo"
								className="h-9 w-9 object-contain"
							/>
						</div>
						<div>
							<p className="text-sm font-bold text-black sm:text-base">{t("appName")}</p>
							<p className="text-xs sm:text-sm" style={{ color: "var(--clay-muted)" }}>
								{t("appSubtitle")}
							</p>
						</div>
					</div>
					{userName ? (
						<div className="ml-auto text-right">
							<p className="max-w-25 truncate text-xs font-semibold text-black sm:max-w-35">
								{userName}
							</p>
							{villageName ? (
								<p className="truncate text-[10px]" style={{ color: "var(--clay-muted)" }}>
									{villageName}
								</p>
							) : null}
						</div>
					) : null}
				</header>

				{/* ── Drawer overlay + sidebar ── */}
				<div
					className={`absolute inset-0 z-30 transition ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"
						}`}
					aria-hidden={!drawerOpen}
				>
					{/* Backdrop */}
					<button
						type="button"
						onClick={() => setDrawerOpen(false)}
						className={`absolute inset-0 bg-black/35 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"
							}`}
						aria-label="Close menu overlay"
					/>

					{/* Clay Sidebar */}
					<aside
						className={`clay-sidebar absolute left-0 top-0 h-full w-72 max-w-[86%] p-5 transition-transform duration-300 sm:w-80 ${drawerOpen ? "translate-x-0" : "-translate-x-full"
							}`}
					>
						{/* Sidebar header row */}
						<div className="mb-5 flex items-center justify-between">
							<p className="text-base font-semibold text-black">{t("menu.language")}</p>
							<button
								type="button"
								onClick={() => setDrawerOpen(false)}
								className="clay-btn-round inline-flex h-8 w-8 items-center justify-center text-black"
								aria-label="Close menu"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{/* Language selector — clay box */}
						<div className="clay-lang-box mb-5 p-3">
							<label
								htmlFor="language-select"
								className="mb-2 flex items-center gap-2 text-sm font-medium text-black"
							>
								<Languages className="h-4 w-4" />
								{t("menu.language")}
							</label>
							<select
								id="language-select"
								value={i18n.language}
								onChange={changeLanguage}
								className="w-full rounded-xl px-3 py-2 text-sm text-black outline-none transition"
								style={{
									backgroundColor: "var(--clay-bg)",
									border: "1.5px solid rgba(255,255,255,0.55)",
									boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
								}}
							>
								{languageOptions.map(option => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						{/* Nav items */}
						<nav className="space-y-2">
							<button
								type="button"
								onClick={() => { navigate('/profile'); setDrawerOpen(false); }}
								className="clay-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-black"
							>
								<User className="h-4 w-4" />
								{t("menu.profile")}
							</button>
							<button
								type="button"
								onClick={() => { setDrawerOpen(false); }}
								className="clay-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-black"
							>
								<Settings className="h-4 w-4" />
								{t("menu.settings")}
							</button>
							{menuItems.slice(2).map(item => {
								const Icon = item.icon;
								const handleClick = () => {
									setDrawerOpen(false);
									if (item.key === 'logout') {
										dispatch(logout()).then(() => navigate('/'));
									}
								};
								return (
									<button
										key={item.key}
										type="button"
										onClick={handleClick}
										className="clay-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-black"
									>
										<Icon className="h-4 w-4" />
										{item.label}
									</button>
								);
							})}
						</nav>
					</aside>
				</div>

				{/* ── Main content ── */}
				<main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 pb-24 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8">
					<div>
						<h1 className="text-lg font-bold text-black sm:text-xl md:text-2xl">
							{userName
								? `👋 ${t('dashboard.hello', { defaultValue: 'Hello' })}, ${userName}!`
								: t("dashboardTitle")
							}
						</h1>
						<p className="text-sm md:text-base" style={{ color: "var(--clay-muted)" }}>
							{villageName
								? `${villageName} · ${t("dashboardSubtitle")}`
								: t("dashboardSubtitle")
							}
						</p>
					</div>

					{/* ── Features Grid — Clay Cards ── */}
					<section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
						{cards.map(card => {
							const Icon = card.icon;

							return (
								<button
									key={card.key}
									type="button"
									onClick={() => card.route && navigate(card.route)}
									className={`clay-card p-3 text-left sm:p-4 ${card.fullWidth ? "col-span-2 md:col-span-3 lg:col-span-4" : "col-span-1"
										}`}
								>
									{/* Icon — clay circle */}
									<div
										className="clay-icon mb-3 inline-flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11"
										style={{ backgroundColor: "var(--clay-bg)", color: "var(--clay-primary)" }}
									>
										<Icon className="h-5 w-5" />
									</div>

									<h2 className="text-sm font-semibold text-black sm:text-base">
										{card.title}
									</h2>
									<p
										className="mt-1 text-xs leading-5 sm:text-sm"
										style={{ color: "var(--clay-muted)" }}
									>
										{card.description}
									</p>
								</button>
							);
						})}
					</section>
				</main>

			</div>
		</div>
	);
}

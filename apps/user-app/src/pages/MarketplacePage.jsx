import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    Search,
    SlidersHorizontal,
    Plus,
    MapPin,
    ShoppingBag,
    X,
    Package,
} from "lucide-react";
import { addListing, fetchListings } from "../features/marketplace/marketplaceSlice";

const FILTER_KEYS = ["all", "furniture", "clothes", "electronics", "appliances", "books", "other"];

const STATUS_STYLES = {
    available: { bg: "#E8F5E9", color: "#2E7D32" },
    reserved: { bg: "#FFF8E1", color: "#F57F17" },
    sold: { bg: "#FFEBEE", color: "#C62828" },
};

/* ─── Add Item Bottom Sheet ──────────────────────────────── */
function AddItemSheet({ t, filters, onClose, onSubmit }) {
    const [form, setForm] = useState({
        name: "", price: "", category: "furniture", description: "", location: "", photo: null,
    });
    const [photoPreview, setPhotoPreview] = useState(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setForm(f => ({ ...f, photo: file }));
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.name.trim() || !form.price) return;
        onSubmit({
            ...form,
            id: Date.now(),
            distance: "0m",
            ward: form.location || "Ward ?",
            status: "available",
            emoji: "📦",
            color: "#C8E6C9",
            photo: form.photo,
        });
        onClose();
    };

    const inputStyle = {
        backgroundColor: "var(--clay-bg)",
        border: "1.5px solid rgba(255,255,255,0.55)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
        borderRadius: "16px",
    };

    return (
        <>
            {/* Backdrop */}
            <button
                className="fixed inset-0 z-40 bg-black/40"
                onClick={onClose}
                aria-label="Close"
            />

            {/* Sheet */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md"
                style={{
                    backgroundColor: "var(--clay-bg)",
                    borderRadius: "28px 28px 0 0",
                    boxShadow: "0 -8px 32px rgba(0,0,0,0.14), inset 0 2px 4px rgba(255,255,255,0.40)",
                    animation: "slideUp 0.35s cubic-bezier(0.34,1.4,0.64,1) both",
                }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: "var(--clay-card)" }} />
                </div>

                <div className="px-5 pb-8 pt-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-bold text-black">{t("marketplacePage.addForm.title")}</h2>
                        <button onClick={onClose} className="clay-btn-round inline-flex h-8 w-8 items-center justify-center text-black">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Name */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-black">{t("marketplacePage.addForm.name")}</label>
                            <input
                                name="name" value={form.name} onChange={handleChange} required
                                placeholder={t("marketplacePage.addForm.namePlaceholder")}
                                className="w-full px-3 py-2.5 text-sm text-black outline-none"
                                style={inputStyle}
                            />
                        </div>

                        {/* Price + Category row */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-black">{t("marketplacePage.addForm.price")}</label>
                                <input
                                    name="price" type="number" value={form.price} onChange={handleChange} required
                                    placeholder={t("marketplacePage.addForm.pricePlaceholder")}
                                    className="w-full px-3 py-2.5 text-sm text-black outline-none"
                                    style={inputStyle}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-black">{t("marketplacePage.addForm.category")}</label>
                                <select
                                    name="category" value={form.category} onChange={handleChange}
                                    className="w-full px-3 py-2.5 text-sm text-black outline-none"
                                    style={inputStyle}
                                >
                                    {FILTER_KEYS.filter(k => k !== "all").map(k => (
                                        <option key={k} value={k}>{t(`marketplacePage.filters.${k}`)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-black">{t("marketplacePage.addForm.description")}</label>
                            <textarea
                                name="description" value={form.description} onChange={handleChange} rows={2}
                                placeholder={t("marketplacePage.addForm.descPlaceholder")}
                                className="w-full resize-none px-3 py-2.5 text-sm text-black outline-none"
                                style={inputStyle}
                            />
                        </div>

                        {/* Photo */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-black">
                                {t("marketplacePage.addForm.photo", { defaultValue: "Photo (optional)" })}
                            </label>
                            {!photoPreview ? (
                                <label
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-5 text-center"
                                    style={{ borderColor: 'var(--clay-card-alt, #ddd)' }}
                                >
                                    <Package className="mb-1 h-6 w-6" style={{ color: 'var(--clay-muted)' }} />
                                    <span className="text-xs" style={{ color: 'var(--clay-muted)' }}>
                                        {t("marketplacePage.addForm.photoTap", { defaultValue: "Tap to add photo" })}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                </label>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={photoPreview}
                                        alt="listing"
                                        className="aspect-video w-full rounded-xl object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setPhotoPreview(null); setForm(f => ({ ...f, photo: null })); }}
                                        className="absolute right-2 top-2 clay-btn-round inline-flex h-7 w-7 items-center justify-center"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-black">{t("marketplacePage.addForm.location")}</label>
                            <input
                                name="location" value={form.location} onChange={handleChange}
                                placeholder={t("marketplacePage.addForm.locationPlaceholder")}
                                className="w-full px-3 py-2.5 text-sm text-black outline-none"
                                style={inputStyle}
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button" onClick={onClose}
                                className="flex-1 rounded-2xl py-3 text-sm font-medium text-black transition"
                                style={{ backgroundColor: "var(--clay-card)", boxShadow: "var(--clay-shadow)" }}
                            >
                                {t("marketplacePage.addForm.cancel")}
                            </button>
                            <button
                                type="submit"
                                className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition"
                                style={{
                                    background: "linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))",
                                    boxShadow: "0 4px 14px rgba(46,125,50,0.40)",
                                }}
                            >
                                {t("marketplacePage.addForm.submit")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

/* ─── Product Card ───────────────────────────────────────── */
function ProductCard({ product, t }) {
    const statusStyle = STATUS_STYLES[product.status] ?? STATUS_STYLES.available;

    return (
        <div
            className="clay-card flex flex-col overflow-hidden p-0"
            style={{ cursor: "pointer" }}
        >
            {/* Image area */}
            <div
                className="relative flex aspect-square items-center justify-center text-5xl"
                style={{ backgroundColor: product.color }}
            >
                {product.photo_url ? (
                    <div className="h-full w-full p-4">
                        <img
                            src={product.photo_url}
                            alt={product.name}
                            className="h-full w-full rounded-2xl object-contain"
                        />
                    </div>
                ) : (
                    <span>{product.emoji}</span>
                )}

                {/* Status badge */}
                <span
                    className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                >
                    {t(`marketplacePage.status.${product.status}`)}
                </span>
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-black">{product.name}</h3>
                <p className="text-sm font-bold" style={{ color: "var(--clay-primary)" }}>
                    ₹{product.price}
                </p>
                <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--clay-muted)" }}>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{product.distance} {t("marketplacePage.away")} · {product.ward}</span>
                </div>
            </div>
        </div>
    );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyState({ t, onAdd }) {
    return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div
                className="clay-icon flex h-20 w-20 items-center justify-center"
                style={{ backgroundColor: "var(--clay-card)" }}
            >
                <ShoppingBag className="h-9 w-9" style={{ color: "var(--clay-primary)" }} />
            </div>
            <div>
                <p className="text-base font-bold text-black">{t("marketplacePage.emptyTitle")}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--clay-muted)" }}>
                    {t("marketplacePage.emptySubtitle")}
                </p>
            </div>
            <button
                onClick={onAdd}
                className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white"
                style={{
                    background: "linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))",
                    boxShadow: "0 4px 14px rgba(46,125,50,0.40)",
                }}
            >
                <Plus className="h-4 w-4" />
                {t("marketplacePage.addFirst")}
            </button>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function MarketplacePage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mineOnly = searchParams.get('mine') === 'true';
    const { t } = useTranslation();
    const { listings, loading } = useSelector((s) => s.marketplace);
    const user = useSelector((s) => s.auth.user);
    const villageId = user?.user_metadata?.village_id || user?.village_id;

    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [filterRotated, setFilterRotated] = useState(false);
    useEffect(() => {
        dispatch(fetchListings({ villageId, mineOnly }));
    }, [dispatch, villageId, mineOnly]);

    const mapListingToProduct = (item) => ({
        id: item.id,
        name: item.title || item.name || 'Item',
        price: item.price || 0,
        photo_url: item.photo_url || null,
        distance: item.distance || '',
        ward: item.village?.name || item.ward || '-',
        category: item.category || 'other',
        status: item.status || 'available',
        emoji: item.emoji || '📦',
        color: item.color || '#C8E6C9',
        user_id: item.user_id,
        seller_id: item.seller_id,
    });

    const products = useMemo(() => listings.map(mapListingToProduct), [listings]);

    const handleAddItem = async (newItem) => {
        const contactNumber =
            user?.phone ||
            user?.phone_number ||
            user?.user_metadata?.phone ||
            user?.user_metadata?.phone_number ||
            user?.user_metadata?.mobile ||
            '';

        await dispatch(addListing({
            name: newItem.name,
            description: newItem.description,
            price: newItem.price,
            contact: contactNumber,
            photo: newItem.photo || null,
        }));
        dispatch(fetchListings({ villageId, mineOnly }));
    };

    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchesFilter = activeFilter === "all" || p.category === activeFilter;
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [products, activeFilter, search]);

    const visibleListings = mineOnly
        ? filtered.filter(l => l.user_id === user?.id || l.seller_id === user?.id)
        : filtered;

    return (
        <div className="min-h-screen text-black" style={{ backgroundColor: "var(--clay-bg)" }}>
            <div className="relative min-h-screen w-full" style={{ backgroundColor: "var(--clay-bg)" }}>

                {/* ── Header ── */}
                <header className="clay-header sticky top-0 z-20 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="clay-btn-round inline-flex h-10 w-10 shrink-0 items-center justify-center text-black"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div
                                className="clay-icon flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden"
                                style={{ backgroundColor: "#fff" }}
                            >
                                <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-black sm:text-base">
                                    {mineOnly ? t('marketplace.myListings', { defaultValue: 'My Listings' }) : t("marketplacePage.title")}
                                </p>
                                <p className="truncate text-xs sm:text-sm" style={{ color: "var(--clay-muted)" }}>
                                    {t("marketplacePage.subtitle")}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Main Content ── */}
                <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-28 sm:px-6 lg:px-8">

                    {/* ── Search + filter wrapper (centered, capped on wide screens) ── */}
                    <div className="mx-auto max-w-2xl">
                        {/* ── Search bar ── */}
                        <div
                            className="mb-4 flex items-center gap-3 px-4 py-3"
                            style={{
                                backgroundColor: "#fff",
                                borderRadius: "20px",
                                boxShadow: "var(--clay-shadow)",
                                border: "1.5px solid rgba(255,255,255,0.70)",
                            }}
                        >
                            <Search className="h-5 w-5 shrink-0" style={{ color: "var(--clay-muted)" }} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t("marketplacePage.searchPlaceholder")}
                                className="flex-1 bg-transparent text-sm text-black outline-none placeholder-gray-400"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-black">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* ── Filter chips row ── */}
                        <div className="mb-4 flex items-center gap-2">
                            {/* Scrollable chips */}
                            <div className="flex flex-1 gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                                {FILTER_KEYS.map(key => {
                                    const active = activeFilter === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setActiveFilter(key)}
                                            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition"
                                            style={
                                                active
                                                    ? {
                                                        backgroundColor: "var(--clay-primary)",
                                                        color: "#fff",
                                                        boxShadow: "0 3px 10px rgba(46,125,50,0.35)",
                                                    }
                                                    : {
                                                        backgroundColor: "var(--clay-card)",
                                                        color: "var(--clay-text)",
                                                        boxShadow: "var(--clay-shadow)",
                                                        border: "1.5px solid rgba(255,255,255,0.55)",
                                                    }
                                            }
                                        >
                                            {t(`marketplacePage.filters.${key}`)}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Filter icon button */}
                            <button
                                onClick={() => setFilterRotated(r => !r)}
                                className="clay-btn-round ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center text-black"
                                style={{ transition: "transform 0.3s ease", transform: filterRotated ? "rotate(45deg)" : "rotate(0deg)" }}
                                aria-label="Filter options"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Product Grid ── */}
                    {(loading && visibleListings.length === 0) ? (
                        <div className="py-12 text-center text-sm" style={{ color: 'var(--clay-muted)' }}>
                            {t('common.loading', { defaultValue: 'Loading...' })}
                        </div>
                    ) : visibleListings.length === 0 ? (
                        mineOnly ? (
                            <div className="flex flex-col items-center gap-4 py-12 text-center">
                                <p className="text-base font-bold text-black">
                                    {t('marketplace.noMyListings', { defaultValue: "You haven't posted any listings yet." })}
                                </p>
                            </div>
                        ) : (
                            <EmptyState t={t} onAdd={() => setShowAddSheet(true)} />
                        )
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {visibleListings.map(product => (
                                <ProductCard key={product.id} product={product} t={t} />
                            ))}
                        </div>
                    )}
                </main>

                {/* ── FAB — Add Item ── */}
                <button
                    type="button"
                    onClick={() => setShowAddSheet(true)}
                    className="clay-fab fixed bottom-5 right-20 inline-flex h-14 w-14 items-center justify-center text-green-50 sm:bottom-5 sm:right-24"
                    aria-label={t("marketplacePage.addItem")}
                    style={{ zIndex: 30 }}
                >
                    <Plus className="h-7 w-7" />
                </button>

                {/* ── Add Item Sheet ── */}
                {showAddSheet && (
                    <AddItemSheet
                        t={t}
                        filters={FILTER_KEYS}
                        onClose={() => setShowAddSheet(false)}
                        onSubmit={handleAddItem}
                    />
                )}
            </div>

            {/* ── keyframes ── */}
            <style>{`
				@keyframes slideUp {
					from { opacity: 0; transform: translateY(40px); }
					to   { opacity: 1; transform: translateY(0); }
				}
			`}</style>
        </div>
    );
}

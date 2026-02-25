import { useState, useEffect } from 'react';
import * as api from '../../services/api';

const CATEGORIES = ['All', 'Live Stream', 'VOD', 'Video', 'Reading', 'Movie', 'TV Show', 'Podcast', 'Other'];
const IMPORTANCE = ['High', 'Medium', 'Low'];
const SOURCES = ['Twitch', 'YouTube', 'Bookmark', 'Watchlist', 'Manual'];

const SOURCE_ICONS = {
    Twitch: '🎮', YouTube: '📺', Bookmark: '🔖', Watchlist: '🎬', Manual: '✍️'
};
const IMPORTANCE_COLORS = {
    High: '#ff6b6b', Medium: '#ffa94d', Low: '#74c0fc'
};

function timeAgo(iso) {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

function DelegationCard({ item, onDelete }) {
    const [confirming, setConfirming] = useState(false);

    const handleDelete = async () => {
        if (!confirming) { setConfirming(true); return; }
        await onDelete(item.id);
    };

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            transition: 'border-color 0.2s',
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
        >
            {/* Importance badge */}
            <div style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: IMPORTANCE_COLORS[item.importance] + '22',
                color: IMPORTANCE_COLORS[item.importance],
                borderRadius: '8px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700,
                border: `1px solid ${IMPORTANCE_COLORS[item.importance]}44`
            }}>
                {item.importance || 'Medium'}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', paddingRight: '5rem' }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                    {SOURCE_ICONS[item.source] || '📋'}
                </span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>{item.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        {item.category && (
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', opacity: 0.8 }}>
                                {item.category}
                            </span>
                        )}
                        <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>
                            {item.source} · {timeAgo(item.added_at)}
                        </span>
                    </div>
                </div>
            </div>

            {item.note && (
                <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.55, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.note}
                </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto' }}>
                {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
                        flex: 1, padding: '0.55rem 1rem', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center',
                        transition: 'background 0.2s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        Open ↗
                    </a>
                )}
                <button onClick={handleDelete} style={{
                    padding: '0.55rem 1rem', borderRadius: '10px',
                    background: confirming ? 'rgba(255,107,107,0.2)' : 'transparent',
                    border: confirming ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.1)',
                    color: confirming ? '#ff6b6b' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s'
                }}>
                    {confirming ? 'Confirm?' : '✕ Done'}
                </button>
            </div>
        </div>
    );
}

function QuickAddModal({ onClose, onSave }) {
    const [form, setForm] = useState({ title: '', link: '', source: 'Manual', category: 'Other', importance: 'High', note: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSaving(true);
        setError('');
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            console.error('Delegation save failed:', err);
            setError(err?.message || 'Failed to save. Check your Apps Script deployment.');
        } finally {
            setSaving(false);
        }
    };

    const field = (label, key, type = 'text', opts = {}) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 600 }}>{label}</label>
            {opts.as === 'select' ? (
                <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}>
                    {opts.options.map(o => <option key={o} value={o} style={{ background: '#1a1a2e', color: '#fff' }}>{o}</option>)}
                </select>
            ) : opts.as === 'textarea' ? (
                <textarea rows={3} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={opts.placeholder || ''} style={{ ...inputStyle, resize: 'none' }} />
            ) : (
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={opts.placeholder || ''} style={inputStyle} />
            )}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '2rem', width: '480px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>📥 Add to Delegation</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {field('Title *', 'title', 'text', { placeholder: 'e.g. "Watch this stream later"' })}
                    {field('Link (optional)', 'link', 'url', { placeholder: 'https://...' })}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        {field('Source', 'source', 'text', { as: 'select', options: SOURCES })}
                        {field('Category', 'category', 'text', { as: 'select', options: CATEGORIES.filter(c => c !== 'All') })}
                        {field('Importance', 'importance', 'text', { as: 'select', options: IMPORTANCE })}
                    </div>
                    {field('Note (optional)', 'note', 'text', { as: 'textarea', placeholder: 'Why is this important?' })}
                    {error && (
                        <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(255,107,107,0.1)', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.3)' }}>
                            ⚠️ {error}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.9rem', borderRadius: '12px', background: 'linear-gradient(135deg, #a970ff, #7c4dff)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Delegating…' : '📥 Delegate This'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputStyle = {
    padding: '0.75rem 1rem', borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box'
};

export default function DelegationPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => { loadItems(); }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const res = await api.getDelegation();
            // Backend returns { success, data: [...] }, _call unwraps outer, so res = { success, data: [...] }
            const list = Array.isArray(res) ? res : (res?.data || []);
            setItems([...list].reverse());
        } catch (err) {
            console.error('Failed to load delegation items', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (form) => {
        const res = await api.saveDelegationItem(form);
        // Backend returns { success, data: { ...savedItem } }
        const saved = res?.data || res;
        if (!saved || !saved.id) throw new Error('Unexpected response from server. Check your Apps Script deployment.');
        setItems(prev => [saved, ...prev]);
    };

    const handleDelete = async (id) => {
        await api.deleteDelegationItem(id);
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const filtered = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);

    const counts = CATEGORIES.reduce((acc, c) => {
        acc[c] = c === 'All' ? items.length : items.filter(i => i.category === c).length;
        return acc;
    }, {});

    return (
        <div className="fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(135deg, #a970ff, #7c4dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📥 Delegation
                    </h1>
                    <p style={{ margin: '6px 0 0 0', opacity: 0.5, fontSize: '0.9rem' }}>
                        {items.length} item{items.length !== 1 ? 's' : ''} waiting · Things that matter, but can wait
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.6rem', borderRadius: '14px', background: 'linear-gradient(135deg, #a970ff, #7c4dff)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(169,112,255,0.3)' }}
                >
                    + Add Item
                </button>
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {CATEGORIES.filter(c => counts[c] > 0 || c === 'All').map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                        padding: '0.45rem 1.1rem', borderRadius: '20px', cursor: 'pointer',
                        border: `1px solid ${activeCategory === cat ? '#a970ff' : 'rgba(255,255,255,0.1)'}`,
                        background: activeCategory === cat ? 'rgba(169,112,255,0.18)' : 'rgba(255,255,255,0.04)',
                        color: activeCategory === cat ? '#a970ff' : 'rgba(255,255,255,0.6)',
                        fontWeight: activeCategory === cat ? 700 : 400,
                        fontSize: '0.82rem', transition: 'all 0.2s'
                    }}>
                        {cat} {counts[cat] > 0 && <span style={{ opacity: 0.6, marginLeft: '4px' }}>{counts[cat]}</span>}
                    </button>
                ))}
            </div>

            {/* Items grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '20px' }} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.4, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
                    <p>Nothing delegated yet.<br />Use the "📥 Delegation" toggle when saving streams, videos, or bookmarks!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                    {filtered.map(item => (
                        <DelegationCard key={item.id} item={item} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
        </div>
    );
}

import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useDashboard } from '../../hooks/useDashboard';

export default function WatchlistPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const { stats } = useDashboard();

    const apiKey = stats?.config?.tmdb_api_key;

    useEffect(() => {
        loadWatchlist();
    }, []);

    const loadWatchlist = async () => {
        try {
            const data = await api.getWatchlist();
            setItems(data || []);
        } catch (err) {
            console.error('Failed to load watchlist', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        if (!apiKey) {
            // Fallback: Just search for a dummy title if no key
            setSearchResults([{ title: searchQuery, type: 'movie', poster_path: null, release_date: '?' }]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults((data.results || []).map(r => ({
                id: r.id,
                title: r.title || r.name,
                type: r.media_type,
                poster_path: r.poster_path,
                release_date: r.release_date || r.first_air_date
            })));
        } catch (err) {
            console.error('TMDB Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const addItem = async (item, shouldDelegate = false) => {
        const newItem = {
            id: Date.now().toString(),
            title: item.title,
            type: item.type || 'movie',
            poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            status: 'to-watch', // to-watch, watching, finished
            rating: 0,
            added_at: new Date().toISOString()
        };

        try {
            await api.saveWatchlist(newItem);
            setItems([newItem, ...items]);
            if (shouldDelegate) {
                await api.saveDelegationItem({
                    title: newItem.title,
                    source: 'Watchlist',
                    link: '',
                    category: newItem.type === 'tv' ? 'TV Show' : 'Movie',
                    importance: 'Medium'
                });
            }
            setShowAdd(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            alert('Failed to add item');
        }
    };

    const updateStatus = async (id, status) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const updated = { ...item, status };
        try {
            await api.saveWatchlist(updated);
            setItems(items.map(i => i.id === id ? updated : i));
        } catch (err) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>🎬 Watchlist</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Movies, shows, and documentaries to experience.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Add Title
                </button>
            </div>

            {!apiKey && (
                <div style={{ background: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.2)', padding: '0.8rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#ff9f43' }}>
                    Note: Add TMDB_API_KEY to your settings for automatic movie search and posters.
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                    {items.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            Your watchlist is empty. What's next on your screen?
                        </div>
                    )}
                    {items.map(item => (
                        <div key={item.id} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s'
                        }}>
                            <div style={{ height: '300px', background: '#222', position: 'relative' }}>
                                {item.poster_url ? (
                                    <img src={item.poster_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.2 }}>🎬</div>
                                )}
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                    {item.status.replace('-', ' ')}
                                </div>
                            </div>
                            <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', lineHeight: '1.3' }}>{item.title}</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5, textTransform: 'capitalize' }}>{item.type}</p>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    {item.status !== 'watching' && item.status !== 'finished' && (
                                        <button onClick={() => updateStatus(item.id, 'watching')} style={{ flex: 1, fontSize: '0.7rem', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Watch</button>
                                    )}
                                    {item.status !== 'finished' && (
                                        <button onClick={() => updateStatus(item.id, 'finished')} style={{ flex: 1, fontSize: '0.7rem', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Done</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Add to Watchlist</h2>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <input
                                type="text"
                                placeholder="Search movies or TV shows..."
                                autoFocus
                                style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" disabled={searching} style={{ padding: '0.9rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                {searching ? '...' : apiKey ? 'Search' : 'Add'}
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {searchResults.map((res, i) => (
                                <div key={i} onClick={() => addItem(res)} style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ width: '45px', height: '65px', background: '#333', borderRadius: '6px', overflow: 'hidden' }}>
                                        {res.poster_path && <img src={`https://image.tmdb.org/t/p/w92${res.poster_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{res.title}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{res.type} {res.release_date ? `(${res.release_date.split('-')[0]})` : ''}</div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>+</div>
                                </div>
                            ))}
                            {!apiKey && searchQuery && (
                                <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                                    Click Add to include this title manually.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

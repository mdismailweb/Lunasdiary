import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

export default function TwitchPage() {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');

    const loadChannels = useCallback(async () => {
        setLoading(true);
        try {
            const chans = await api.getTwitchChannels();
            setChannels(chans);
        } catch (err) {
            console.error('Load Twitch channels error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadChannels();
    }, [loadChannels]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setError('');
        try {
            console.log('[Twitch] Searching for:', searchQuery.trim());
            const ch = await api.searchTwitchChannel(searchQuery.trim());
            console.log('[Twitch] Search result:', ch);

            if (!ch || ch.error) {
                setError(ch?.error || 'Channel not found.');
                return;
            }

            const newCh = {
                id: ch.id,
                login: ch.broadcaster_login,
                display_name: ch.display_name,
                profile_image_url: ch.thumbnail_url,
            };

            await api.saveTwitchChannel(newCh);
            setChannels(prev => [...prev, newCh]);
            setSearchQuery('');
        } catch (err) {
            console.error('[Twitch] Search Exception:', err);
            setError('Error searching Twitch channel: ' + err.message);
        } finally {
            setSearching(false);
        }
    };

    const handleRemove = async (id) => {
        try {
            await api.removeTwitchChannel(id);
            setChannels(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Remove Twitch channel error:', err);
        }
    };

    return (
        <div className="twitch-page fade-in" style={{ padding: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h1 className="greeting-h1" style={{ margin: 0 }}>🎮 Twitch Management</h1>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="field-input"
                            placeholder="Search channel name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ width: '250px' }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleSearch}
                            disabled={searching}
                        >
                            {searching ? '...' : 'Follow'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(255,118,117,0.1)', borderRadius: '12px', border: '1px solid rgba(255,118,117,0.2)', marginBottom: '1.5rem' }}>
                        <p style={{ margin: 0, color: '#ff7675', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="empty-state">Loading channels...</div>
                ) : (
                    <div className="twitch-channel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {Array.isArray(channels) && channels.map(ch => (
                            <div key={ch.id} className="yt-channel-card" style={{ padding: '1.2rem', position: 'relative' }}>
                                <img
                                    src={ch.profile_image_url}
                                    alt={ch.display_name}
                                    style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '0.8rem', border: '2px solid #a970ff' }}
                                />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ch.display_name}</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>@{ch.login}</div>
                                </div>
                                <button
                                    className="yt-ch-remove"
                                    onClick={() => handleRemove(ch.id)}
                                    style={{ position: 'absolute', top: '10px', right: '10px' }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && channels.length === 0 && (
                    <div className="empty-state" style={{ marginTop: '4rem' }}>
                        <span className="empty-emoji">🎮</span>
                        <p>Follow a Twitch channel to see their activity on the dashboard</p>
                    </div>
                )}
            </div>
        </div>
    );
}

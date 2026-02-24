import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import TwitchPlayerModal from './TwitchPlayerModal';

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

// ── Sub-components ─────────────────────────────────────────────
function TwitchChannelCard({ ch, selected, onClick, onRemove }) {
    return (
        <div className={`yt-channel-card ${selected ? 'active' : ''}`} onClick={onClick}>
            <img src={ch.profile_image_url} alt={ch.display_name} className="yt-ch-avatar" style={{ border: '2px solid #a970ff' }} />
            <div className="yt-ch-info">
                <span className="yt-ch-name">{ch.display_name}</span>
                <span className="yt-ch-subs">@{ch.login}</span>
            </div>
            <button className="yt-ch-remove" onClick={e => { e.stopPropagation(); onRemove(ch.id); }} title="Remove">✕</button>
        </div>
    );
}

function TwitchVideoCard({ item, type, onPlay, onSave, onDismiss }) {
    const isLive = type === 'live';
    const isSaved = type === 'library';
    const isPending = type === 'pending';

    // Construct IDs for the player
    const channelName = isLive ? item.user_login : null;
    const videoId = !isLive ? (item.video_id || item.id) : null;

    return (
        <div className={isPending ? "yt-pending-card" : "yt-video-card"} onClick={() => onPlay(channelName, videoId)} style={{ cursor: 'pointer' }}>
            <div className={isPending ? "yt-pending-link" : ""}>
                <div className="yt-thumb-wrap">
                    <img
                        src={item.thumbnail_url?.replace('{width}', '400').replace('{height}', '225') || item.thumbnail}
                        alt={item.title}
                        className="yt-thumb"
                        style={{ borderBottom: isLive ? '3px solid #ff4655' : 'none' }}
                    />
                    {isLive && <span className="yt-ago" style={{ background: '#ff4655', color: '#fff' }}>LIVE</span>}
                    {!isLive && <span className="yt-ago">{timeAgo(item.created_at || item.published_at || item.saved_at)}</span>}
                </div>
                <div className="yt-video-info">
                    <p className="yt-video-title">{item.title}</p>
                    <span className="yt-video-ch">{item.user_name || item.display_name}</span>
                </div>
            </div>

            {(isPending || isLive) && onSave && (
                <div className="yt-pending-actions">
                    <button
                        className="yt-approve-btn"
                        onClick={(e) => { e.stopPropagation(); onSave(item, isLive); }}
                        title={isLive ? "Bookmark Stream" : "Add to Library"}
                        style={{ background: isLive ? 'rgba(169, 112, 255, 0.2)' : undefined, color: isLive ? '#a970ff' : undefined }}
                    >
                        ＋
                    </button>
                    {onDismiss && (
                        <button className="yt-dismiss-btn" onClick={(e) => { e.stopPropagation(); onDismiss(item.id || item.video_id); }} title="Dismiss">
                            ✕
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────
export default function TwitchPage() {
    const [channels, setChannels] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());
    const [library, setLibrary] = useState([]);

    const [streams, setStreams] = useState([]);
    const [videos, setVideos] = useState([]);

    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addQuery, setAddQuery] = useState('');
    const [adding, setAdding] = useState(false);

    const [activePlayer, setActivePlayer] = useState({ channel: null, videoId: null });

    const loadSyncData = useCallback(async () => {
        try {
            const [chans, lib, data] = await Promise.all([
                api.getTwitchChannels(),
                api.getSavedTwitchVideos(),
                api.getTwitchData()
            ]);

            setChannels(Array.isArray(chans) ? chans : []);
            setLibrary(lib || []);
            setDismissed(new Set(data.dismissed || []));
            setStreams(data.streams || []);
            setVideos(data.videos || []);

            if (data.error) setError(data.error);
        } catch (err) {
            console.error('Twitch load error:', err);
            setError('Failed to connect to Twitch API.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSyncData();
    }, [loadSyncData]);

    const handleAdd = async () => {
        if (!addQuery.trim()) return;
        setAdding(true);
        setError('');
        try {
            const ch = await api.searchTwitchChannel(addQuery.trim());
            if (!ch || ch.error) { setError(ch?.error || 'Channel not found.'); return; }
            if (channels.find(c => c.id === ch.id)) { setError('Already followed!'); return; }

            const newCh = {
                id: ch.id,
                login: ch.broadcaster_login,
                display_name: ch.display_name,
                profile_image_url: ch.thumbnail_url,
            };

            await api.saveTwitchChannel(newCh);
            setChannels(prev => [...prev, newCh]);
            setAddQuery('');
            loadSyncData(); // Refresh data for new channel
        } catch (err) {
            setError('Error adding channel.');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (id) => {
        try {
            await api.removeTwitchChannel(id);
            setChannels(prev => prev.filter(c => c.id !== id));
            if (selected === id) setSelected(null);
        } catch (err) {
            console.error('Remove channel error:', err);
        }
    };

    const handleSave = async (item, isLive) => {
        // Smart Save logic: If live, we try to find the video_id if possible, 
        // but for now we'll save the stream info. 
        // Twitch Helix doesn't always have a 1:1 stream_id -> video_id mapping 
        // until the stream ends. Improving this might need a back-end job.

        const payload = {
            video_id: item.video_id || item.id,
            title: item.title,
            user_name: item.user_name || item.display_name,
            user_id: item.user_id || item.id,
            thumbnail_url: item.thumbnail_url || item.thumbnail,
            created_at: item.created_at || item.published_at || new Date().toISOString(),
            type: isLive ? 'live' : 'archive',
            url: isLive ? `https://twitch.tv/${item.user_login}` : item.url,
            duration: item.duration || ''
        };

        try {
            await api.saveTwitchVideo(payload);
            setLibrary(prev => [payload, ...prev]);
        } catch (err) {
            console.error('Save twitch video error:', err);
        }
    };

    const handleDismiss = async (itemId) => {
        try {
            await api.saveTwitchDismissed(itemId);
            setDismissed(prev => new Set([...prev, itemId]));
        } catch (err) {
            console.error('Dismiss error:', err);
        }
    };

    // Filter Logic
    const filteredStreams = selected ? streams.filter(s => s.user_id === selected) : streams;
    const filteredLibrary = selected ? library.filter(v => v.user_id === selected) : library;
    const pendingVideos = videos.filter(v =>
        !library.some(l => l.video_id === v.id) &&
        !dismissed.has(v.id) &&
        (!selected || v.user_id === selected)
    );

    return (
        <div className="videos-layout">
            <aside className="videos-sidebar">
                <div className="videos-sidebar-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>🎮 Twitch</h2>
                </div>
                <div className="yt-add-row">
                    <input
                        className="field-input yt-add-input"
                        placeholder="Search channel..."
                        value={addQuery}
                        onChange={e => setAddQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding}>
                        {adding ? '…' : '+'}
                    </button>
                </div>
                {error && <p className="yt-error">{error}</p>}

                {channels.length > 1 && (
                    <button className={`yt-all-btn ${!selected ? 'active' : ''}`} onClick={() => setSelected(null)}>
                        🌐 All Followed
                    </button>
                )}

                <div className="yt-channel-list">
                    {channels.map(ch => (
                        <TwitchChannelCard key={ch.id} ch={ch} selected={selected === ch.id}
                            onClick={() => setSelected(ch.id)} onRemove={handleRemove} />
                    ))}
                    {!loading && channels.length === 0 && (
                        <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                            <span className="empty-emoji">📡</span>
                            <p>Follow a channel to see live streams and VODs</p>
                        </div>
                    )}
                </div>
            </aside>

            <main className="videos-feed">
                {loading && (
                    <div className="yt-loading">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="yt-video-skeleton">
                                <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 8 }} />
                                <div className="skeleton" style={{ height: 14, marginTop: 8, borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && (
                    <>
                        {/* 1. Live Now Section */}
                        {filteredStreams.length > 0 && (
                            <div className="yt-pending-section" style={{ borderLeft: '4px solid #ff4655' }}>
                                <div className="yt-pending-header">
                                    <span className="yt-pending-title" style={{ color: '#ff4655' }}>🔴 Live Now</span>
                                    <span className="yt-pending-count" style={{ background: '#ff4655' }}>{filteredStreams.length}</span>
                                </div>
                                <div className="yt-video-grid">
                                    {filteredStreams.map(s => (
                                        <TwitchVideoCard
                                            key={s.id}
                                            item={s}
                                            type="live"
                                            onPlay={(ch, vid) => setActivePlayer({ channel: ch, videoId: vid })}
                                            onSave={handleSave}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Recent Highlights (Recent VODs) */}
                        {pendingVideos.length > 0 && (
                            <div className="yt-pending-section" style={{ marginTop: '2.5rem' }}>
                                <div className="yt-pending-header">
                                    <span className="yt-pending-title">🎞️ Recent Highlights</span>
                                    <span className="yt-pending-count">{pendingVideos.length}</span>
                                </div>
                                <div className="yt-pending-grid">
                                    {pendingVideos.map(v => (
                                        <TwitchVideoCard
                                            key={v.id}
                                            item={v}
                                            type="pending"
                                            onPlay={(ch, vid) => setActivePlayer({ channel: ch, videoId: vid })}
                                            onSave={handleSave}
                                            onDismiss={handleDismiss}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Saved Library */}
                        {filteredLibrary.length > 0 && (
                            <div style={{ marginTop: '2.5rem' }}>
                                <div className="yt-approved-header">✅ Saved Library</div>
                                <div className="yt-video-grid">
                                    {filteredLibrary.map(v => (
                                        <TwitchVideoCard
                                            key={v.video_id}
                                            item={v}
                                            type="library"
                                            onPlay={(ch, vid) => setActivePlayer({ channel: ch, videoId: vid })}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredStreams.length === 0 && pendingVideos.length === 0 && filteredLibrary.length === 0 && channels.length > 0 && (
                            <div className="empty-state" style={{ marginTop: '6rem' }}>
                                <span className="empty-emoji">🎮</span>
                                <p>No active streams or recent highlights found.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            <TwitchPlayerModal
                channel={activePlayer.channel}
                videoId={activePlayer.videoId}
                onClose={() => setActivePlayer({ channel: null, videoId: null })}
            />
        </div>
    );
}

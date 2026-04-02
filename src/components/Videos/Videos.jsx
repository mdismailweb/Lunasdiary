import { useState, useEffect, useCallback } from 'react';
import { searchChannel, getChannelVideos } from '../../services/youtube';
import * as api from '../../services/api';
import YTPlayerModal from './YTPlayerModal';

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

// ── Sub-components ─────────────────────────────────────────────
function ChannelCard({ ch, selected, onClick, onRemove }) {
    return (
        <div className={`yt-channel-card ${selected ? 'active' : ''}`} onClick={onClick}>
            <img src={ch.thumbnail} alt={ch.title} className="yt-ch-avatar" />
            <div className="yt-ch-info">
                <span className="yt-ch-name">{ch.title}</span>
                <span className="yt-ch-subs">{ch.subs}</span>
            </div>
            <button className="yt-ch-remove" onClick={e => { e.stopPropagation(); onRemove(ch.id); }} title="Remove">✕</button>
        </div>
    );
}

function VideoCard({ video, onPlay }) {
    const vidId = video.id || video.video_id;
    return (
        <div className="yt-video-card" onClick={() => onPlay(vidId)} style={{ cursor: 'pointer' }}>
            <div className="yt-thumb-wrap">
                <img src={video.thumbnail} alt={video.title} className="yt-thumb" />
                <span className="yt-ago">{timeAgo(video.publishedAt || video.published_at)}</span>
            </div>
            <div className="yt-video-info">
                <p className="yt-video-title">{video.title}</p>
                <span className="yt-video-ch">{video.channelTitle || video.channel_title}</span>
            </div>
        </div>
    );
}

function PendingCard({ video, onApprove, onDismiss, onPlay }) {
    const [saving, setSaving] = useState(false);
    const [shouldDelegate, setShouldDelegate] = useState(false);
    const [delegateDueDate, setDelegateDueDate] = useState('');

    const handleApprove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaving(true);
        await onApprove(video, shouldDelegate, delegateDueDate);
        setSaving(false);
    };

    const handleDismissAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss(video.id);
    };

    return (
        <div className="yt-pending-card" onClick={() => onPlay(video.id)} style={{ cursor: 'pointer' }}>
            <div className="yt-pending-link">
                <div className="yt-thumb-wrap">
                    <img src={video.thumbnail} alt={video.title} className="yt-thumb" />
                    <span className="yt-ago">{timeAgo(video.publishedAt)}</span>
                </div>
                <div className="yt-video-info">
                    <p className="yt-video-title">{video.title}</p>
                    <span className="yt-video-ch">{video.channelTitle}</span>
                </div>
            </div>
            <div className="yt-pending-actions" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="delegate-toggle" style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={shouldDelegate} onChange={e => setShouldDelegate(e.target.checked)} style={{ width: '12px', height: '12px' }} />
                        📥 Delegation
                    </label>
                    <button className="yt-approve-btn" onClick={handleApprove} disabled={saving} title="Add to Library">
                        {saving ? '…' : '＋'}
                    </button>
                </div>
                {shouldDelegate && (
                    <input
                        type="datetime-local"
                        value={delegateDueDate}
                        onChange={e => setDelegateDueDate(e.target.value)}
                        style={{ padding: '3px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(169,112,255,0.3)', color: 'white', colorScheme: 'dark', fontSize: '0.7rem', width: '100%' }}
                        placeholder="Due date/time"
                    />
                )}
                <button className="yt-dismiss-btn" onClick={handleDismissAction} title="Ignore Video">
                    ✕
                </button>
            </div>
        </div>
    );
}

// ── Main Videos Component ──────────────────────────────────────
export default function Videos() {
    const [channels, setChannels] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());
    const [library, setLibrary] = useState([]); // Full list from sheet

    const [selected, setSelected] = useState(null);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addQuery, setAddQuery] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    const [activeVideo, setActiveVideo] = useState(null); // ID for the modal player
    const [activeTab, setActiveTab] = useState('feed'); // mobile only: feed | saved | channels

    // Load initial data from Google Sheets
    const loadSyncData = useCallback(async () => {
        try {
            const [chans, ids, approvedList] = await Promise.all([
                api.getYTChannels(),
                api.getYTDismissed(),
                api.getSavedVideos()
            ]);
            setChannels(chans);
            setDismissed(new Set(ids));
            setLibrary(approvedList);
        } catch (err) {
            console.error('Load sync error:', err);
        }
    }, []);

    useEffect(() => {
        loadSyncData().finally(() => setLoading(false));
    }, [loadSyncData]);

    const fetchVideos = useCallback(async (chans, sel, ignored, savedSet) => {
        if (!chans.length) {
            setPending([]);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const targets = sel ? chans.filter(c => c.id === sel) : chans;
            const results = await Promise.all(targets.map(c => getChannelVideos(c.uploadsId, sel ? 20 : 8)));
            const flat = results.flat().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            // Pending = flat MINUS (already saved in library OR ignored)
            const waiting = flat.filter(v => !savedSet.has(v.id) && !ignored.has(v.id));
            setPending(waiting);
        } catch {
            setError('Failed to load videos. Check your API key or network.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Re-fetch uploads when channels/selection/library IDs change
    useEffect(() => {
        if (channels.length || !loading) {
            const savedIds = new Set(library.map(v => v.video_id || v.id));
            fetchVideos(channels, selected, dismissed, savedIds);
        }
    }, [channels, selected, dismissed, library]); // eslint-disable-line

    const handleAdd = async () => {
        if (!addQuery.trim()) return;
        setAdding(true);
        setError('');
        try {
            const ch = await searchChannel(addQuery.trim());
            if (!ch) { setError('Channel not found. Try the exact handle (e.g. @mkbhd)'); return; }
            if (channels.find(c => c.id === ch.id)) { setError('Already subscribed!'); return; }

            const sub = ch.statistics?.subscriberCount;
            const subs = sub
                ? (sub >= 1_000_000 ? `${(sub / 1_000_000).toFixed(1)}M subs`
                    : sub >= 1_000 ? `${(sub / 1_000).toFixed(0)}K subs`
                        : `${sub} subs`) : '';

            const newCh = {
                id: ch.id, title: ch.snipped?.title || ch.snippet.title,
                thumbnail: ch.snippet.thumbnails?.default?.url,
                uploadsId: ch.contentDetails.relatedPlaylists.uploads,
                subs,
            };

            await api.saveYTChannel(newCh);
            setChannels(prev => [...prev, newCh]);
            setAddQuery('');
            if (activeTab === 'channels') setActiveTab('feed'); // Switch back to feed after adding
        } catch {
            setError('Error searching channel. Try again.');
        } finally {
            setAdding(false);
        }
    };

    const removeChannel = async (id) => {
        try {
            await api.removeYTChannel(id);
            setChannels(prev => prev.filter(c => c.id !== id));
            if (selected === id) setSelected(null);
        } catch (err) {
            console.error('Remove channel error:', err);
        }
    };

    const handleApprove = async (video, shouldDelegate = false, delegateDueDate = '') => {
        const payload = {
            video_id: video.id,
            title: video.title,
            channel_title: video.channelTitle,
            channel_id: video.channelId,
            thumbnail: video.thumbnail,
            published_at: video.publishedAt,
        };
        try {
            await api.saveVideo(payload);
            setLibrary(prev => [payload, ...prev]);

            if (shouldDelegate) {
                await api.saveDelegationItem({
                    title: payload.title,
                    source: 'YouTube',
                    link: `https://youtube.com/watch?v=${payload.video_id}`,
                    category: 'Video',
                    importance: 'High',
                    due_date: delegateDueDate || ''
                });
            }
        } catch (err) {
            console.error('Save video error:', err);
        }
    };

    const handleDismiss = async (videoId) => {
        try {
            await api.saveYTDismissed(videoId);
            setDismissed(prev => new Set([...prev, videoId]));
        } catch (err) {
            console.error('Dismiss video error:', err);
        }
    };

    // Filter library based on selected channel (if any)
    const filteredLibrary = selected
        ? library.filter(v => (v.channel_id || v.channelId) === selected)
        : library;

    return (
        <div className="videos-layout">
            {/* ─── Mobile Segmented Control ─── */}
            <div className="vault-mobile-nav mobile-only" style={{ marginBottom: '1.25rem' }}>
                <div className="vault-segments">
                    <button className={activeTab === 'feed' ? 'active' : ''} onClick={() => setActiveTab('feed')}>🔥 Feed</button>
                    <button className={activeTab === 'saved' ? 'active' : ''} onClick={() => setActiveTab('saved')}>📚 Saved</button>
                    <button className={activeTab === 'channels' ? 'active' : ''} onClick={() => setActiveTab('channels')}>📡 Channels</button>
                </div>
            </div>

            {/* ─── Desktop Sidebar ─── */}
            <aside className="videos-sidebar desktop-only">
                <div className="videos-sidebar-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>📺 Channels</h2>
                </div>
                <div className="yt-add-row">
                    <input
                        className="field-input yt-add-input"
                        placeholder="@handle or channel name"
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
                        🌐 All channels
                    </button>
                )}
                <div className="yt-channel-list">
                    {channels.map(ch => (
                        <ChannelCard key={ch.id} ch={ch} selected={selected === ch.id}
                            onClick={() => setSelected(ch.id)} onRemove={removeChannel} />
                    ))}
                    {!loading && channels.length === 0 && (
                        <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                            <span className="empty-emoji">📡</span>
                            <p>Add a channel above to see their latest videos</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Mobile Channels View ─── */}
            {activeTab === 'channels' && (
                <div className="mobile-channels-view mobile-only fade-in" style={{ width: '100%', padding: '0.5rem' }}>
                    <div className="mobile-channel-list-grid">
                        {/* Integrated Add Card */}
                        <div className="mobile-channel-card add-card" onClick={() => {
                            const val = window.prompt('Enter YouTube @handle or channel name:');
                            if (val) handleAdd(val);
                        }}>
                            <div className="add-icon">＋</div>
                            <span>Add Channel</span>
                        </div>

                        {channels.map(ch => (
                            <div key={ch.id} className={`mobile-channel-card ${selected === ch.id ? 'active' : ''}`} onClick={() => { setSelected(ch.id); setActiveTab('feed'); }}>
                                <img src={ch.thumbnail} alt="" className="card-avatar" />
                                <span className="card-name">{ch.title}</span>
                                <button className="card-remove" onClick={(e) => { e.stopPropagation(); removeChannel(ch.id); }}>✕</button>
                            </div>
                        ))}
                    </div>
                    {error && <p className="yt-error" style={{ marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
                </div>
            )}

            {/* ─── Video Feed Area ─── */}
            <main className={`videos-feed ${(activeTab === 'channels' && 'desktop-only') || ''}`}>
                {/* Mobile Channel Strip (on Feed tab) */}
                {activeTab === 'feed' && channels.length > 0 && (
                    <div className="mobile-channel-strip mobile-only fade-in">
                        <div className={`strip-item ${!selected ? 'active' : ''}`} onClick={() => setSelected(null)}>
                            <div className="strip-avatar-all">🌐</div>
                            <span>All</span>
                        </div>
                        {channels.map(ch => (
                            <div key={ch.id} className={`strip-item ${selected === ch.id ? 'active' : ''}`} onClick={() => setSelected(ch.id)}>
                                <img src={ch.thumbnail} alt="" className="strip-avatar" />
                                <span>{ch.title.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="yt-loading">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="yt-video-skeleton">
                                <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 8 }} />
                                <div className="skeleton" style={{ height: 14, marginTop: 8, borderRadius: 4 }} />
                                <div className="skeleton" style={{ height: 12, marginTop: 6, width: '60%', borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && (
                    <div className="fade-in">
                        {/* Pending Approval section */}
                        {activeTab === 'feed' && pending.length > 0 && (
                            <div className="yt-pending-section">
                                <div className="yt-pending-header">
                                    <span className="yt-pending-title">🕐 Newly Added</span>
                                    <span className="yt-pending-count">{pending.length}</span>
                                </div>
                                <div className="yt-pending-grid">
                                    {pending.map(v => (
                                        <PendingCard
                                            key={v.id}
                                            video={v}
                                            onApprove={handleApprove}
                                            onDismiss={handleDismiss}
                                            onPlay={setActiveVideo}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Approved/Saved Library section */}
                        {(activeTab === 'saved' || (activeTab === 'feed' && pending.length === 0)) && filteredLibrary.length > 0 && (
                            <div className={pending.length > 0 ? 'yt-approved-section' : ''}>
                                <div className="yt-approved-header">✅ Saved Library</div>
                                <div className="yt-video-grid">
                                    {filteredLibrary.map(v => (
                                        <VideoCard
                                            key={v.video_id || v.id}
                                            video={v}
                                            onPlay={setActiveVideo}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab !== 'channels' && filteredLibrary.length === 0 && pending.length === 0 && channels.length > 0 && (
                            <div className="empty-state">
                                <span className="empty-emoji">🎬</span>
                                <p>No videos found</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Global Modal Player */}
            <YTPlayerModal videoId={activeVideo} onClose={() => setActiveVideo(null)} />
        </div>
    );
}

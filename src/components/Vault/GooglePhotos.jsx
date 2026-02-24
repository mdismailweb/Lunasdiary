import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ColumnsPhotoAlbum } from "react-photo-album";
import "react-photo-album/columns.css";
import { getVaultMedia, getLikedImages, toggleLikedImage, getFaceGroups } from '../../services/api';
import { SkeletonCard } from '../Shared/Skeleton';
import FaceScanner from './FaceScanner';
import FaceGroupsView from './FaceGroupsView';


// ─── VaultLightbox ───────────────────────────────────────────
function VaultLightbox({ items, index, onClose, likedIds, onLike }) {
    const [current, setCurrent] = useState(index);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => { setCurrent(index); setScale(1); setTranslate({ x: 0, y: 0 }); }, [index]);

    const navigate = (dir) => {
        setCurrent(c => (c + dir + items.length) % items.length);
        setScale(1); setTranslate({ x: 0, y: 0 });
    };

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'ArrowLeft') navigate(-1);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [items.length, onClose]);

    const handleWheel = (e) => {
        e.preventDefault();
        setScale(s => Math.min(4, Math.max(0.5, s + (e.deltaY > 0 ? -0.15 : 0.15))));
    };
    const handleMouseDown = (e) => {
        if (e.button === 2) { e.preventDefault(); setDragging(true); setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y }); }
    };
    const handleMouseMove = (e) => { if (dragging) setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => setDragging(false);

    if (index < 0 || !items[current]) return null;
    const item = items[current];
    const isVideo = item.type === 'video';
    const isLiked = likedIds?.has(item.id);

    return ReactDOM.createPortal(
        <div onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.96)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', paddingBottom: '90px', boxSizing: 'border-box', zIndex: 99999,
        }}>
            {/* Top-right controls */}
            {/* Like button */}
            {onLike && (
                <button onClick={(e) => { e.stopPropagation(); onLike(item); }}
                    style={{ position: 'absolute', top: '1rem', right: '4.5rem', background: isLiked ? 'rgba(239,68,68,0.3)' : 'rgba(0,0,0,0.55)', border: isLiked ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {isLiked ? '❤️' : '🤍'}
                </button>
            )}
            {/* Close button */}
            <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>✕</button>

            {/* Title */}
            {item.title && (
                <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.5)', padding: '4px 14px', borderRadius: '20px', maxWidth: '60vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                </div>
            )}

            {/* Prev */}
            {items.length > 1 && <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>‹</button>}

            {/* Media */}
            <div onClick={e => e.stopPropagation()}
                onWheel={isVideo ? undefined : handleWheel}
                onMouseDown={isVideo ? undefined : handleMouseDown}
                onMouseMove={isVideo ? undefined : handleMouseMove}
                onMouseUp={isVideo ? undefined : handleMouseUp}
                onMouseLeave={isVideo ? undefined : handleMouseUp}
                onContextMenu={e => e.preventDefault()}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 80px', boxSizing: 'border-box', overflow: 'hidden', userSelect: 'none', cursor: isVideo ? 'default' : (dragging ? 'grabbing' : (scale > 1 ? 'zoom-out' : 'zoom-in')) }}>
                {isVideo ? (
                    // Google Drive videos embed via iframe — file must be shared "Anyone with link"
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', width: 'min(80vw, 960px)', height: 'min(65vh, 540px)' }}>
                            {/* Loading overlay */}
                            <div id={`vid-loading-${item.id}`} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 1 }}>
                                <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Loading video…</span>
                            </div>
                            <iframe
                                src={`https://drive.google.com/file/d/${item.id}/preview`}
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative', zIndex: 2 }}
                                allow="autoplay; fullscreen"
                                allowFullScreen
                                title={item.title}
                                onLoad={(e) => {
                                    const overlay = document.getElementById(`vid-loading-${item.id}`);
                                    if (overlay) overlay.style.display = 'none';
                                }}
                            />
                        </div>
                        {/* Fallback button if iframe is blocked */}
                        <a
                            href={`https://drive.google.com/file/d/${item.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '5px 14px', transition: 'all 0.2s' }}
                        >
                            ↗ Open in Google Drive
                        </a>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <img src={item.largeSrc} alt={item.title} referrerPolicy="no-referrer" draggable={false}
                        style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, transition: dragging ? 'none' : 'transform 0.15s ease', transformOrigin: 'center center' }}
                        onDoubleClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}
                        onError={(e) => { if (e.target.src !== item.src) e.target.src = item.src; }}
                    />
                )}
            </div>

            {/* Next */}
            {items.length > 1 && <button onClick={(e) => { e.stopPropagation(); navigate(1); }} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>›</button>}

            {/* Filmstrip */}
            {items.length > 1 && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '1rem', display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '90vw', padding: '0.5rem' }}>
                    {items.map((it, i) => (
                        <img key={i} src={it.src} alt={it.title} referrerPolicy="no-referrer" onClick={() => navigate(i - current)}
                            style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: i === current ? '2px solid white' : '2px solid transparent', opacity: i === current ? 1 : 0.6, transition: 'all 0.2s', flexShrink: 0 }} />
                    ))}
                </div>
            )}
        </div>,
        document.body
    );
}

// ─── MediaGrid ───────────────────────────────────────────────
function MediaGrid({ items, likedIds, onLike, onOpen }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '6px',
        }}
            className="vault-grid"
        >
            <style>{`
                @media (max-width: 767px) { .vault-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                @media (min-width: 768px) and (max-width: 1023px) { .vault-grid { grid-template-columns: repeat(4, 1fr) !important; } }
            `}</style>
            {items.map((photo, index) => (
                <div
                    key={photo.id || index}
                    onClick={() => onOpen(index)}
                    style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', cursor: 'pointer', aspectRatio: '1 / 1', background: 'rgba(255,255,255,0.05)' }}
                >
                    <img
                        src={photo.src}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { e.target.style.opacity = '0.3'; }}
                    />

                    {/* Gradient scrim */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', pointerEvents: 'none' }} />

                    {/* Like button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onLike(photo); }}
                        style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', zIndex: 5, lineHeight: 1, padding: '2px', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}
                    >
                        {likedIds.has(photo.id) ? '❤️' : '🤍'}
                    </button>

                    {/* Video: centered play button overlay */}
                    {photo.type === 'video' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,255,255,0.4)' }}>
                                <span style={{ fontSize: '14px', marginLeft: '2px' }}>▶</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main Component — receives activeTab & folders from VaultPage ─────
export default function GooglePhotos({ activeTab, folders, onTabChange }) {
    const [liked, setLiked] = useState([]);
    const [folderCache, setFolderCache] = useState({});
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [lightboxItems, setLightboxItems] = useState([]);
    const [likePending, setLikePending] = useState(new Set());
    const [faceMode, setFaceMode] = useState('grid'); // grid | scanner | groups
    const [scannedGroups, setScannedGroups] = useState([]);


    // Load liked images from Sheets on mount
    useEffect(() => {
        getLikedImages()
            .then(res => setLiked(res.data?.liked || []))
            .catch(() => { })
            .finally(() => setInitLoading(false));
    }, []);

    // Fetch a folder's media if not yet cached
    useEffect(() => {
        if (!activeTab || activeTab === 'liked') return;
        const folder = folders?.find(f => f.id === activeTab);
        setFaceMode('grid');
        setScannedGroups([]);
        if (!folder || folderCache[folder.folderId]) return;
        fetchFolder(folder);
    }, [activeTab, folders]);

    const fetchFolder = async (folder, isLoadMore = false) => {
        setLoading(true); setError(null);
        const currentData = folderCache[folder.folderId] || { items: [], nextToken: null };

        try {
            const res = await getVaultMedia(folder.folderId, isLoadMore ? currentData.nextToken : null);
            const raw = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
            const nextToken = res?.data?.continuationToken || res?.continuationToken || null;

            const formatted = raw.map(item => ({
                id: item.id, src: item.thumbnailLink, width: 400, height: 300,
                largeSrc: item.viewLink || item.thumbnailLink, videoSrc: item.viewLink,
                title: item.name, type: item.mimeType?.startsWith('video/') ? 'video' : 'image',
            }));

            setFolderCache(c => ({
                ...c,
                [folder.folderId]: {
                    items: isLoadMore ? [...currentData.items, ...formatted] : formatted,
                    nextToken: nextToken
                }
            }));
        } catch (err) {
            console.error('Vault fetch error:', err);
            setError('Could not load folder. Make sure it\'s shared as "Anyone with the link".');
        } finally { setLoading(false); }
    };

    const likedIds = new Set(liked.map(l => l.id));

    const handleLike = async (photo) => {
        if (likePending.has(photo.id)) return;
        setLikePending(p => new Set(p).add(photo.id));
        const isLiked = likedIds.has(photo.id);
        setLiked(prev => isLiked ? prev.filter(l => l.id !== photo.id) : [...prev, { ...photo }]);
        try {
            await toggleLikedImage({ id: photo.id, title: photo.title, src: photo.src, largeSrc: photo.largeSrc, type: photo.type });
        } catch {
            setLiked(prev => isLiked ? [...prev, { ...photo }] : prev.filter(l => l.id !== photo.id));
        } finally {
            setLikePending(p => { const n = new Set(p); n.delete(photo.id); return n; });
        }
    };

    if (initLoading) return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    // ─── Liked Tab ───
    if (activeTab === 'liked') {
        return (
            <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {liked.length} liked items
                </p>
                {liked.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-emoji">🤍</div>
                        <p>No liked images yet. Tap ❤️ on any image to save it here.</p>
                    </div>
                ) : (
                    <MediaGrid items={liked} likedIds={likedIds} onLike={handleLike} onOpen={(i) => { setLightboxItems(liked); setLightboxIndex(i); }} />
                )}
                <VaultLightbox items={lightboxItems} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} likedIds={likedIds} onLike={handleLike} />
            </div>
        );
    }

    // ─── Folder Tab ───
    if (!activeTab) return (
        <div className="empty-state">
            <div className="empty-emoji">🗂️</div>
            <p style={{ color: 'var(--text-muted)' }}>Select a folder or ❤️ Liked from the sidebar.</p>
        </div>
    );

    const folder = folders?.find(f => f.id === activeTab);
    if (!folder) return null;
    const folderData = folderCache[folder.folderId];
    const items = folderData?.items || [];
    const hasMore = !!folderData?.nextToken;

    if (loading && items.length === 0) return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );
    if (error && items.length === 0) return (
        <div className="empty-state">
            <div className="empty-emoji">⚠️</div><p>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => { setFolderCache(c => { const n = { ...c }; delete n[folder.folderId]; return n; }); fetchFolder(folder); }}>Retry</button>
        </div>
    );
    if (!loading && items.length === 0) return (
        <div className="empty-state"><div className="empty-emoji">🖼️</div><p>No media found in this folder.</p></div>
    );

    if (faceMode === 'scanner') {
        return (
            <div style={{ padding: '2rem 1rem' }}>
                <FaceScanner
                    folderId={folder.folderId}
                    images={items}
                    onComplete={(groups) => { setScannedGroups(groups); setFaceMode('groups'); }}
                    onCancel={() => setFaceMode('grid')}
                />
            </div>
        );
    }

    if (faceMode === 'groups') {
        return (
            <div style={{ padding: '2rem 0' }}>
                <FaceGroupsView
                    folderId={folder.folderId}
                    groups={scannedGroups}
                    onSave={() => setFaceMode('grid')}
                    onBack={() => setFaceMode('scanner')}
                />
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {items.length} items {hasMore ? '(more available)' : ''} · {folder.name}
                    </p>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => setFaceMode('scanner')}>🧬 Scan Faces</button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setFolderCache(c => { const n = { ...c }; delete n[folder.folderId]; return n; }); fetchFolder(folder); }} disabled={loading}>🔄</button>
            </div>

            <MediaGrid items={items} likedIds={likedIds} onLike={handleLike} onOpen={(i) => { setLightboxItems(items); setLightboxIndex(i); }} />

            {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => fetchFolder(folder, true)}
                        disabled={loading}
                        style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    >
                        {loading ? 'Loading...' : 'Load More Images'}
                    </button>
                </div>
            )}

            <VaultLightbox items={lightboxItems} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} likedIds={likedIds} onLike={handleLike} />
        </div>
    );
}


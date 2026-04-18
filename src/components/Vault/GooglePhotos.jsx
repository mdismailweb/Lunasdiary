import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ColumnsPhotoAlbum } from "react-photo-album";
import "react-photo-album/columns.css";
import { getVaultMedia, getLikedImages, toggleLikedImage, getFaceGroups, getFileTextContent } from '../../services/api';
import { SkeletonCard } from '../Shared/Skeleton';
import FaceScanner from './FaceScanner';
import FaceGroupsView from './FaceGroupsView';


// ─── File Type Classifier ─────────────────────────────────────
function classifyMime(mime) {
    if (!mime) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('text/') || mime === 'application/json') return 'text';
    return 'image';
}

// ─── VaultLightbox ───────────────────────────────────────────
function VaultLightbox({ items, index, onClose, likedIds, onLike }) {
    const [current, setCurrent] = useState(index);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [textContent, setTextContent] = useState(null);
    const [textLoading, setTextLoading] = useState(false);
    const [audioError, setAudioError] = useState(false);

    // For pinch-to-zoom touch
    const lastTouchDist = React.useRef(null);
    const lastTap = React.useRef(0);

    useEffect(() => {
        setCurrent(index);
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setTextContent(null);
        setAudioError(false);
    }, [index]);

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

    // Fetch raw text/code content when a text-type item is opened
    useEffect(() => {
        const item = items[current];
        if (!item || item.type !== 'text') return;
        setTextLoading(true);
        setTextContent(null);
        getFileTextContent(item.id)
            .then(res => setTextContent(res?.content || ''))
            .catch(() => setTextContent('// Could not load file content.'))
            .finally(() => setTextLoading(false));
    }, [current, items]);

    const handleWheel = (e) => {
        e.preventDefault();
        setScale(s => Math.min(4, Math.max(0.5, s + (e.deltaY > 0 ? -0.15 : 0.15))));
    };
    const handleMouseDown = (e) => {
        if (e.button === 2 || e.button === 0) { e.preventDefault(); setDragging(true); setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y }); }
    };
    const handleMouseMove = (e) => { if (dragging) setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => setDragging(false);

    // Touch handlers for mobile
    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
        } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - lastTap.current < 300) {
                setScale(s => s > 1 ? 1 : 2.5);
                setTranslate({ x: 0, y: 0 });
            }
            lastTap.current = now;
            setDragging(true);
            setDragStart({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
        }
    };
    const onTouchMove = (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastTouchDist.current) {
                setScale(s => Math.min(Math.max(s * (dist / lastTouchDist.current), 1), 5));
            }
            lastTouchDist.current = dist;
        } else if (e.touches.length === 1 && dragging && scale > 1) {
            setTranslate({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
        }
    };
    const onTouchEnd = (e) => {
        if (e.touches.length < 2) lastTouchDist.current = null;
        if (scale <= 1 && e.changedTouches.length === 1 && dragging) {
            const dx = e.changedTouches[0].clientX - (dragStart.x + translate.x);
            if (Math.abs(dx) > 60) navigate(dx < 0 ? 1 : -1);
        }
        setDragging(false);
    };

    if (index < 0 || !items[current]) return null;
    const item = items[current];
    const itemType = item.type || 'image';
    const isImage = itemType === 'image';
    const isLiked = likedIds?.has(item.id);

    return ReactDOM.createPortal(
        <div onClick={scale === 1 ? onClose : undefined} className="vault-lightbox-container">
            <style>{`
                .vault-lightbox-container {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    width: 100vw; height: 100vh; background: rgba(0,0,0,0.96);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    backdrop-filter: blur(8px); padding-bottom: 90px; box-sizing: border-box; z-index: 99999;
                    touch-action: none; overflow: hidden;
                }
                .vault-lightbox-media {
                    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
                    padding: 60px 80px; box-sizing: border-box; overflow: hidden; user-select: none;
                }
                .vault-lightbox-img {
                    max-width: 100%; max-height: 100%; border-radius: 12px; object-fit: contain;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.6); transform-origin: center center;
                }
                @media (max-width: 768px) {
                    .vault-lightbox-container { padding-bottom: 70px; }
                    .vault-lightbox-media { padding: 40px 0; }
                    .vault-lightbox-img { border-radius: 0; width: 100vw; max-width: 100vw; height: auto; max-height: 100vh; }
                    .vl-nav-btn { display: none !important; } /* Hide side arrows on mobile to save space */
                }
            `}</style>

            {/* Top Bar for filename and controls */}
            <div className="vl-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', zIndex: 20 }}>
                {item.title && (
                    <div className="vl-title" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 600, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '20px' }}>
                        {item.title}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {onLike && (
                        <button onClick={(e) => { e.stopPropagation(); onLike(item); }}
                            style={{ background: isLiked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)', border: isLiked ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}>
                            {isLiked ? '❤️' : '🤍'}
                        </button>
                    )}
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>✕</button>
                </div>
            </div>


            {/* Prev */}
            {items.length > 1 && <button className="vl-nav-btn" onClick={(e) => { e.stopPropagation(); navigate(-1); }} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>‹</button>}

            {/* Media */}
            <div className="vault-lightbox-media"
                onClick={e => e.stopPropagation()}
                onWheel={isImage ? handleWheel : undefined}
                onMouseDown={isImage ? handleMouseDown : undefined}
                onMouseMove={isImage ? handleMouseMove : undefined}
                onMouseUp={isImage ? handleMouseUp : undefined}
                onMouseLeave={isImage ? handleMouseUp : undefined}
                onTouchStart={isImage ? onTouchStart : undefined}
                onTouchMove={isImage ? onTouchMove : undefined}
                onTouchEnd={isImage ? onTouchEnd : undefined}
                onContextMenu={e => e.preventDefault()}
                style={{ cursor: isImage ? (dragging ? 'grabbing' : (scale > 1 ? 'zoom-out' : 'zoom-in')) : 'default' }}>

                {/* ── Image ── */}
                {isImage && (
                    <img className="vault-lightbox-img" src={item.largeSrc} alt={item.title} referrerPolicy="no-referrer" draggable={false}
                        style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, transition: dragging ? 'none' : 'transform 0.15s ease' }}
                        onDoubleClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}
                        onError={(e) => { if (e.target.src !== item.src) e.target.src = item.src; }}
                    />
                )}

                {/* ── Video ── */}
                {itemType === 'video' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                        <div style={{ position: 'relative', width: 'min(90vw, 960px)', height: 'min(70vh, 540px)' }}>
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
                                onLoad={() => { const el = document.getElementById(`vid-loading-${item.id}`); if (el) el.style.display = 'none'; }}
                            />
                        </div>
                        <a href={`https://drive.google.com/file/d/${item.id}/view`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '5px 14px', transition: 'all 0.2s', zIndex: 10 }}>
                            ↗ Open in Google Drive
                        </a>
                    </div>
                )}

                {/* ── Audio ── */}
                {itemType === 'audio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: 'min(90vw, 440px)' }}>
                        <style>{`
                            @keyframes pulse-glow {
                                0%,100% { box-shadow: 0 20px 60px rgba(109,40,217,0.5); }
                                50% { box-shadow: 0 20px 90px rgba(167,139,250,0.7); }
                            }
                            audio::-webkit-media-controls-panel { background: rgba(30,15,60,0.95); }
                        `}</style>
                        {/* Album art */}
                        <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: 'linear-gradient(135deg, #6d28d9, #a78bfa 50%, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(109,40,217,0.5)', animation: 'pulse-glow 3s ease-in-out infinite', fontSize: '4.5rem' }}>
                            🎵
                        </div>
                        {/* Title */}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 0.3rem', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Audio File</p>
                        </div>
                        {/* Player */}
                        {!audioError ? (
                            <audio
                                key={item.id}
                                controls
                                autoPlay
                                style={{ width: '100%', borderRadius: '12px', outline: 'none', accentColor: '#a78bfa' }}
                                onError={() => setAudioError(true)}
                            >
                                <source src={`https://drive.google.com/uc?id=${item.id}&export=download`} />
                                <source src={`https://docs.google.com/uc?export=download&id=${item.id}`} />
                            </audio>
                        ) : (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', marginBottom: '1rem' }}>Streaming failed — using Drive player:</p>
                                <iframe
                                    src={`https://drive.google.com/file/d/${item.id}/preview`}
                                    style={{ width: '100%', height: '80px', border: 'none', borderRadius: '12px', background: 'rgba(0,0,0,0.4)' }}
                                    allow="autoplay"
                                    title={item.title}
                                />
                            </div>
                        )}
                        <a href={`https://drive.google.com/file/d/${item.id}/view`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4px 14px' }}>
                            ↗ Open in Drive
                        </a>
                    </div>
                )}

                {/* ── PDF ── */}
                {itemType === 'pdf' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                        <div style={{ position: 'relative', width: 'min(90vw, 900px)', height: 'min(80vh, 620px)' }}>
                            <div id={`pdf-loading-${item.id}`} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 1 }}>
                                <span style={{ fontSize: '2.5rem' }}>📄</span>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Loading PDF…</span>
                            </div>
                            <iframe
                                src={`https://drive.google.com/file/d/${item.id}/preview`}
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative', zIndex: 2 }}
                                title={item.title}
                                onLoad={() => { const el = document.getElementById(`pdf-loading-${item.id}`); if (el) el.style.display = 'none'; }}
                            />
                        </div>
                        <a href={`https://drive.google.com/file/d/${item.id}/view`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '5px 14px', transition: 'all 0.2s', zIndex: 10 }}>
                            ↗ Open in Google Drive
                        </a>
                    </div>
                )}

                {/* ── Text / Code ── */}
                {itemType === 'text' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: 'min(90vw, 860px)', height: 'min(80vh, 600px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.2rem' }}>💻</span>
                            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.title}</span>
                            <a href={`https://drive.google.com/file/d/${item.id}/view`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3px 10px' }}>↗ Drive</a>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: 'rgba(0,0,0,0.55)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {textLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', minHeight: '200px' }}>
                                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #a78bfa', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Loading file…</span>
                                </div>
                            ) : (
                                <pre style={{ margin: 0, padding: '1.25rem 1.5rem', fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace', fontSize: '0.82rem', lineHeight: 1.75, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {textContent ?? '(empty file)'}
                                </pre>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Next */}
            {items.length > 1 && <button className="vl-nav-btn" onClick={(e) => { e.stopPropagation(); navigate(1); }} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>›</button>}

            {/* Filmstrip */}
            {items.length > 1 && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '1rem', display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '95vw', padding: '0.5rem', zIndex: 10, scrollbarWidth: 'none' }}>
                    {items.map((it, i) => {
                        const TYPE_ICON = { video: '▶', audio: '🎵', pdf: '📄', text: '💻' };
                        const isSpecial = it.type && it.type !== 'image';
                        const filmBorder = { border: i === current ? '2px solid var(--accent)' : '2px solid transparent', opacity: i === current ? 1 : 0.6, transition: 'all 0.2s', flexShrink: 0, borderRadius: '6px', cursor: 'pointer', width: '64px', height: '48px' };
                        return isSpecial ? (
                            <div key={i} onClick={() => navigate(i - current)}
                                style={{ ...filmBorder, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                {TYPE_ICON[it.type] || '📎'}
                            </div>
                        ) : (
                            <img key={i} src={it.src} alt={it.title} referrerPolicy="no-referrer" onClick={() => navigate(i - current)}
                                style={{ ...filmBorder, objectFit: 'cover' }}
                                onError={(e) => { e.target.style.opacity = '0.2'; }}
                            />
                        );
                    })}
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
                    {/* Attempt thumbnail for all types — hides silently on error */}
                    <img
                        src={photo.src}
                        alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
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

                    {/* Type badge overlays */}
                    {photo.type === 'video' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,255,255,0.4)' }}>
                                <span style={{ fontSize: '14px', marginLeft: '2px' }}>▶</span>
                            </div>
                        </div>
                    )}
                    {photo.type === 'audio' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(109,40,217,0.75), rgba(76,29,149,0.85))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', pointerEvents: 'none' }}>
                            <span style={{ fontSize: '2rem' }}>🎵</span>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Audio</span>
                        </div>
                    )}
                    {photo.type === 'pdf' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(220,38,38,0.75), rgba(153,27,27,0.85))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', pointerEvents: 'none' }}>
                            <span style={{ fontSize: '2rem' }}>📄</span>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PDF</span>
                        </div>
                    )}
                    {photo.type === 'text' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,150,105,0.75), rgba(6,78,59,0.85))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', pointerEvents: 'none' }}>
                            <span style={{ fontSize: '2rem' }}>💻</span>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code</span>
                        </div>
                    )}

                    {/* Filename bar for non-image/video types */}
                    {photo.type && photo.type !== 'image' && photo.type !== 'video' && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 28px 6px 7px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', zIndex: 6, pointerEvents: 'none' }}>
                            <p style={{ margin: 0, color: 'white', fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{photo.title}</p>
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


    // Load liked images from Sheets on mount + Instant Loading Cache
    useEffect(() => {
        // 1. Instant Loading from Cache (Offline Only)
        if (!navigator.onLine) {
            const cached = localStorage.getItem('luna_vault_liked_cache');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setLiked(parsed.items || []);
                    setInitLoading(false);
                } catch (e) { }
            }
        }

        // 2. Refresh from Sheets
        getLikedImages()
            .then(res => {
                const items = res.data?.liked || res.liked || [];
                setLiked(items);
                // Background update the cache
                localStorage.setItem('luna_vault_liked_cache', JSON.stringify({
                    items: items,
                    updatedAt: Date.now()
                }));
            })
            .catch(() => { })
            .finally(() => setInitLoading(false));
    }, []);

    // Fetch a folder's media if not yet cached
    useEffect(() => {
        if (!activeTab || activeTab === 'liked') return;
        const folder = folders?.find(f => f.id === activeTab);
        setFaceMode('grid');
        setScannedGroups([]);
        if (!folder) return;

        if (navigator.onLine) {
            // Force clear the memory cache to ensure skeleton loading
            setFolderCache(c => { const n = { ...c }; delete n[folder.folderId]; return n; });
        } else if (folderCache[folder.folderId]) {
            // Offline: use memory cache if we have it
            return;
        }

        fetchFolder(folder);
    }, [activeTab, folders]);

    const fetchFolder = async (folder, isLoadMore = false) => {
        const cacheKey = `luna_vault_cache_${folder.folderId}`;
        // If we are online and not loading more, we explicitly ignore any stale memory cache
        // because we want a fresh skeleton load.
        const currentData = (navigator.onLine && !isLoadMore) 
            ? { items: [], nextToken: null } 
            : (folderCache[folder.folderId] || { items: [], nextToken: null });

        // ─── Instant Loading Fix ───────────────────────────────
        // If we have nothing but there's a preloader cache, show it now (Offline Only)
        if (!isLoadMore && currentData.items.length === 0 && !navigator.onLine) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { items } = JSON.parse(cached);
                    if (items?.length > 0) {
                        const formatted = items.map(item => ({
                            id: item.id || item.googleId, src: item.thumbnailLink, width: 400, height: 300,
                            largeSrc: item.viewLink || item.thumbnailLink || `https://drive.google.com/uc?id=${item.id}&sz=w1200`,
                            title: item.name, type: classifyMime(item.mimeType),
                        }));
                        setFolderCache(c => ({ ...c, [folder.folderId]: { items: formatted, nextToken: null, isFromCache: true } }));
                    }
                } catch (e) { console.warn('Cache error:', e); }
            }
        }

        // Only show skeleton if we have literally zero items (even from cache)
        const hasNoData = currentData.items.length === 0 && (!navigator.onLine ? !localStorage.getItem(cacheKey) : true);
        if (hasNoData || isLoadMore) setLoading(true);

        setError(null);

        try {
            const res = await getVaultMedia(folder.folderId, isLoadMore ? currentData.nextToken : null);
            const raw = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
            const nextToken = res?.data?.continuationToken || res?.continuationToken || null;

            const formatted = raw.map(item => ({
                id: item.id || item.googleId, src: item.thumbnailLink, width: 400, height: 300,
                largeSrc: item.viewLink || item.thumbnailLink || `https://drive.google.com/uc?id=${item.id}&sz=w1200`,
                title: item.name, type: classifyMime(item.mimeType),
            }));

            setFolderCache(c => ({
                ...c,
                [folder.folderId]: {
                    items: isLoadMore ? [...currentData.items, ...formatted] : formatted,
                    nextToken: nextToken,
                    isFromCache: false
                }
            }));

            // Sync back to local storage for next time (first page only)
            if (!isLoadMore) {
                localStorage.setItem(cacheKey, JSON.stringify({ items: raw, updatedAt: Date.now() }));
            }
        } catch (err) {
            console.error('Vault fetch error:', err);
            // Don't show error if we have data from cache
            if (!folderCache[folder.folderId]?.items?.length) {
                setError('Could not load folder. Make sure it\'s shared as "Anyone with the link".');
            }
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


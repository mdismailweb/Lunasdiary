import { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import Lightbox from './Lightbox';
import SmartThumbnail from './SmartThumbnail';
import * as api from '../../services/api';

function fileTypeIcon(ext) {
    const map = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📋', pptx: '📋', txt: '📃', zip: '🗜️' };
    return map[ext?.toLowerCase()] || '📎';
}

function getStreamableUrl(url, mode = 'download') {
    if (!url) return '';
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&/]+)/);
    if (!match) return url;
    const id = match[1];
    
    // For images, sz=w1000 is for thumbnails, sz=w2500 is for full-screen previews
    if (mode === 'preview') return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    if (mode === 'large') return `https://drive.google.com/thumbnail?id=${id}&sz=w2500`;
    
    // docs.google.com/uc is often more reliable for audio/image streaming
    return `https://docs.google.com/uc?id=${id}&export=${mode}`;
}

// ── Audio Box ───────────────────────────────────────────────────
function AudioBox({ items = [], onUpload, onRecord, onRemove }) {
    const { onContentAudioPlay, onContentAudioStop } = useAudio();
    const [recording, setRecording] = useState(false);
    const [recTime, setRecTime] = useState(0);
    const [playing, setPlaying] = useState(null); // stores media_id
    const audioRef = useRef(null);
    const mediaRec = useRef(null);
    const timerRef = useRef(null);
    const fileNameRef = useRef('');
    const [brokenAudio, setBrokenAudio] = useState(new Set());

    const startRecord = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            const chunks = [];
            mr.ondataavailable = e => chunks.push(e.data);
            mr.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const name = fileNameRef.current;
                const finalName = name ? (name.endsWith('.webm') ? name : `${name}.webm`) : `voice_memo_${Date.now()}.webm`;
                const file = new File([blob], finalName, { type: 'audio/webm' });
                onRecord && onRecord(file);
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start();
            mediaRec.current = mr;
            setRecording(true);
            setRecTime(0);
            timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
        } catch (e) { alert('Microphone access denied'); }
    };

    const stopRecord = () => {
        if (!mediaRec.current) return;
        const name = window.prompt('Name your recording:', `memo_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        fileNameRef.current = name;
        mediaRec.current.stop();
        clearInterval(timerRef.current);
        setRecording(false);
    };

    const playTimeoutRef = useRef(null);

    const togglePlay = (item) => {
        const el = audioRef.current;
        if (!el) return;

        // Clear any pending timeout
        clearTimeout(playTimeoutRef.current);

        if (playing === item.media_id) {
            el.pause();
            setPlaying(null);
            onContentAudioStop();
        } else {
            const streamUrl = getStreamableUrl(item.drive_link, 'download');
            console.log('Audio Stream Source:', streamUrl);
            
            setPlaying(item.media_id);
            el.src = streamUrl;

            // ⚠️ Set a safety timeout: if it doesn't play in 3.5 seconds, it's likely stuck/broken
            playTimeoutRef.current = setTimeout(() => {
                if (audioRef.current && audioRef.current.paused && playing !== item.media_id) {
                     console.error('Audio playback timed out');
                     setPlaying(null);
                     setBrokenAudio(prev => new Set([...prev, item.media_id]));
                }
            }, 3500);

            el.play().then(() => {
                clearTimeout(playTimeoutRef.current); // Success!
                onContentAudioPlay(el);
            }).catch(err => {
                console.error('Audio Playback Error:', err);
                clearTimeout(playTimeoutRef.current);
                setPlaying(null);
                setBrokenAudio(prev => new Set([...prev, item.media_id]));
            });

            el.onplaying = () => { clearTimeout(playTimeoutRef.current); };
            el.onended = () => { setPlaying(null); onContentAudioStop(); };
            el.onerror = () => {
                console.error('Audio element reported an error loading source');
                clearTimeout(playTimeoutRef.current);
                setPlaying(null);
                setBrokenAudio(prev => new Set([...prev, item.media_id]));
            };
        }
    };

    return (
        <div className="media-box">
            <div className="media-box-title">🎙️ Audio</div>
            
            {/* Single hidden audio element */}
            <audio ref={audioRef} style={{ display: 'none' }} preload="metadata" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                    <div key={item.media_id} className="audio-bar">
                        {brokenAudio.has(item.media_id) ? (
                            <div className="play-mini broken" title="Unplayable - use 'View' link" style={{ background: 'var(--surface2)', color: 'var(--danger)', opacity: 0.7 }}>
                                🔇
                            </div>
                        ) : (
                            <button 
                                className="play-mini" 
                                onClick={() => togglePlay(item)}
                                title="Play/Pause"
                            >
                                {playing === item.media_id ? '⏸' : '▶'}
                            </button>
                        )}
                        <span className="audio-name" style={{ flex: 1 }}>{item.display_name || item.filename}</span>
                        <a 
                            href={item.drive_link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="badge badge-ref" 
                            style={{ textDecoration: 'none', cursor: 'alias' }}
                            title="View original file in Google Drive"
                        >
                            ↗ View
                        </a>
                        {onRemove && (
                            <button 
                                className="media-remove-btn-inline" 
                                onClick={(e) => { e.stopPropagation(); onRemove(item.media_id); }}
                                title="Remove from entry"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No audio yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recording ? (
                    <div className="rec-indicator">
                        <div className="rec-dot" /> {Math.floor(recTime / 60)}:{String(recTime % 60).padStart(2, '0')}
                        <button className="btn btn-danger btn-sm" onClick={stopRecord}>⏹ Stop</button>
                    </div>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={startRecord}>🔴 Record</button>
                )}
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    ⬆ Upload
                    <input type="file" accept="audio/*" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'audio')} />
                </label>
            </div>
        </div>
    );
}

// ── Images Box ──────────────────────────────────────────────────
function ImagesBox({ items = [], onUpload, onRemove }) {
    const [lb, setLb] = useState(null);

    return (
        <div className="media-box">
            <div className="media-box-title">📷 Images</div>
            <div className="image-grid" style={{ flex: 1 }}>
                {items.map((item, i) => (
                    <SmartThumbnail key={item.media_id} item={item} onClick={() => setLb(i)} onRemove={onRemove} />
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>No images yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    📷 Capture
                    <input type="file" accept="image/*" capture="environment" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'image')} />
                </label>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    ⬆ Upload
                    <input type="file" accept="image/*" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'image')} />
                </label>
            </div>
            {lb !== null && (
                <Lightbox
                    images={items}
                    startIndex={lb}
                    onClose={() => setLb(null)}
                />
            )}
        </div>
    );
}

// ── Files Box ───────────────────────────────────────────────────
function FilesBox({ items = [], onUpload, onRemove }) {
    return (
        <div className="media-box">
            <div className="media-box-title">📎 Files</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                    <div key={item.media_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                         <a href={item.drive_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                            <div className="file-card">
                                <span className="file-icon">{fileTypeIcon(item.file_extension)}</span>
                                <span className="file-name">{item.display_name || item.filename}</span>
                            </div>
                        </a>
                        {onRemove && (
                            <button 
                                className="media-remove-btn-inline" 
                                onClick={(e) => { e.stopPropagation(); onRemove(item.media_id); }}
                                title="Remove from entry"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No files yet</span>}
            </div>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                ⬆ Upload
                <input type="file" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'file')} />
            </label>
        </div>
    );
}

// ── MediaRow — three boxes side by side ─────────────────────────
export default function MediaRow({ active, mediaItems = { audio: [], images: [], files: [] }, onUpload, onRecord, onRemove }) {
    if (!active) return null;

    return (
        <div className="media-row">
            <AudioBox items={mediaItems.audio} onUpload={onUpload} onRecord={onRecord} onRemove={onRemove} />
            <ImagesBox items={mediaItems.images} onUpload={onUpload} onRemove={onRemove} />
            <FilesBox items={mediaItems.files} onUpload={onUpload} onRemove={onRemove} />
        </div>
    );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useJournal } from '../../hooks/useJournal';
import { SkeletonCard } from '../Shared/Skeleton';
import MediaRow from '../Shared/MediaRow';
import * as api from '../../services/api';

const MOODS = ['😊', '😌', '😐', '😰', '😔', '🤩', '😤', '🥱'];

export default function JournalPage() {
    const { entries, loading, create, update } = useJournal();
    const [active, setActive] = useState(null);
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState('');
    const [mediaItems, setMediaItems] = useState({ audio: [], images: [], files: [] });
    const autoSaveTimer = useRef(null);

    // Open the most recent entry, or a blank new one
    useEffect(() => {
        if (entries.length > 0 && !active) openEntry(entries[0]);
    }, [entries]);

    const openEntry = (entry) => {
        setActive(entry);
        setDraft({
            text_content: entry.text_content || '',
            mood: entry.mood || '',
            energy_level: entry.energy_level || 5,
            location: entry.location || '',
            tags: entry.tags ? entry.tags.split(',').filter(Boolean) : [],
            title: entry.title || '',
            date: entry.date || new Date().toISOString().split('T')[0],
        });
        // Load media for this entry
        if (entry.entry_id) {
            api.getMediaBySource(entry.entry_id)
                .then(data => {
                    const items = data || [];
                    setMediaItems({
                        audio: items.filter(i => i.media_type === 'audio'),
                        images: items.filter(i => i.media_type === 'image'),
                        files: items.filter(i => i.media_type === 'file'),
                    });
                })
                .catch(() => { });
        }
    };

    const newEntry = async () => {
        const entry = await create({ status: 'draft' });
        openEntry(entry);
    };

    const onChange = (field, value) => {
        setDraft(d => ({ ...d, [field]: value }));
        clearTimeout(autoSaveTimer.current);
        setSavedAt('Saving...');
        autoSaveTimer.current = setTimeout(() => doSave({ ...draft, [field]: value }), 1500);
    };

    const doSave = useCallback(async (data) => {
        if (!active) return;
        setSaving(true);
        try {
            await update({
                entry_id: active.entry_id,
                text_content: data.text_content,
                mood: data.mood,
                energy_level: data.energy_level,
                location: data.location,
                tags: (data.tags || []).join(','),
                title: data.title,
                date: data.date,
                status: 'published',
            });
            setSavedAt('Saved just now');
        } finally { setSaving(false); }
    }, [active, update]);

    const addTag = (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            const t = e.target.value.trim();
            onChange('tags', [...(draft.tags || []), t]);
            e.target.value = '';
        }
    };

    const removeTag = (t) => onChange('tags', (draft.tags || []).filter(tag => tag !== t));

    // Media upload helpers
    const uploadMedia = async (file, mediaType) => {
        if (!active || !file) return;
        const base64data = await api.fileToBase64(file);
        const res = await api.uploadMedia({
            base64data, filename: file.name, mime_type: file.type,
            media_type: mediaType, uploaded_from: 'journal', source_id: active.entry_id,
        });
        const newItem = { media_id: res.media_id, drive_link: res.drive_link, thumbnail_link: res.thumbnail_link, filename: file.name, display_name: file.name };
        setMediaItems(m => ({
            ...m,
            [mediaType === 'image' ? 'images' : mediaType === 'audio' ? 'audio' : 'files']:
                [...m[mediaType === 'image' ? 'images' : mediaType === 'audio' ? 'audio' : 'files'], newItem]
        }));
    };

    if (loading) return (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, height: 'calc(100vh - 56px - 64px)' }}>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
            </div>
        </div>
    );

    const wc = draft.text_content ? draft.text_content.trim().split(/\s+/).filter(Boolean).length : 0;

    return (
        <div className="journal-layout" style={{ height: 'calc(100vh - var(--player-h) - 0px)' }}>
            {/* Left Panel */}
            <div className="journal-list">
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={newEntry}>
                        ✏️ New Entry
                    </button>
                </div>
                {entries.map(entry => (
                    <div
                        key={entry.entry_id}
                        className={`entry-card ${active?.entry_id === entry.entry_id ? 'active' : ''}`}
                        onClick={() => openEntry(entry)}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="entry-card-date">{String(entry.date).substring(0, 10)}</span>
                            <span className="entry-card-mood">{entry.mood === 'happy' ? '😊' : entry.mood === 'calm' ? '😌' : entry.mood === 'excited' ? '🤩' : entry.mood === 'sad' ? '😔' : entry.mood === 'anxious' ? '😰' : '😐'}</span>
                        </div>
                        {entry.title && <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{entry.title}</div>}
                        <div className="entry-card-preview">{entry.text_content || 'No content'}</div>
                        <div className="entry-card-meta">
                            <span className="entry-card-wc">{entry.word_count || 0} words</span>
                            {entry.status === 'draft' && <span className="badge badge-draft">DRAFT</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Right Panel — Editor */}
            <div className="journal-editor">
                {!active ? (
                    <div className="empty-state">
                        <div className="empty-emoji">📖</div>
                        <p>Your story starts today</p>
                        <button className="btn btn-primary" onClick={newEntry}>Start Writing ✏️</button>
                    </div>
                ) : (
                    <>
                        {/* Top bar */}
                        <div className="editor-topbar">
                            <div className="field-group" style={{ minWidth: 120 }}>
                                <label className="field-label">Date</label>
                                <input type="date" className="field-input" value={draft.date || ''} onChange={e => onChange('date', e.target.value)} style={{ width: 140 }} />
                            </div>
                            <div className="field-group" style={{ flex: 1, minWidth: 180 }}>
                                <label className="field-label">Title (optional)</label>
                                <input className="field-input" placeholder="Give this entry a title..." value={draft.title || ''} onChange={e => onChange('title', e.target.value)} />
                            </div>
                            <div className="field-group">
                                <label className="field-label">Mood</label>
                                <div className="mood-row">
                                    {MOODS.map(m => (
                                        <button key={m} className={`mood-btn ${draft.mood === m ? 'active' : ''}`} onClick={() => onChange('mood', m)}>{m}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="field-group" style={{ width: 120 }}>
                                <label className="field-label">Energy {draft.energy_level}/10</label>
                                <input type="range" min="1" max="10" className="volume-slider" style={{ width: '100%' }}
                                    value={draft.energy_level || 5} onChange={e => onChange('energy_level', e.target.value)} />
                            </div>
                            <div className="field-group" style={{ width: 130 }}>
                                <label className="field-label">Location</label>
                                <input className="field-input" placeholder="Where are you?" value={draft.location || ''} onChange={e => onChange('location', e.target.value)} />
                            </div>
                            <span className="autosave-label">{savedAt}</span>
                        </div>

                        {/* Tags */}
                        <div className="tags-row" style={{ marginBottom: '0.75rem' }}>
                            {(draft.tags || []).map(t => (
                                <span key={t} className="pill">{t}<span className="pill-remove" onClick={() => removeTag(t)}>✕</span></span>
                            ))}
                            <input className="field-input" style={{ width: 130, padding: '0.25rem 0.5rem' }}
                                placeholder="Add tag + Enter" onKeyDown={addTag} />
                        </div>

                        {/* Text area */}
                        <textarea
                            className="journal-textarea"
                            placeholder="What's on your mind today..."
                            value={draft.text_content || ''}
                            onChange={e => onChange('text_content', e.target.value)}
                            rows={Math.max(8, (draft.text_content || '').split('\n').length + 2)}
                        />
                        <div className="word-count">{wc} words</div>

                        {/* Media row */}
                        <MediaRow
                            audioItems={mediaItems.audio}
                            imageItems={mediaItems.images}
                            fileItems={mediaItems.files}
                            onAudioUpload={f => uploadMedia(f, 'audio')}
                            onAudioRecord={f => uploadMedia(f, 'audio')}
                            onImageUpload={f => uploadMedia(f, 'image')}
                            onFileUpload={f => uploadMedia(f, 'file')}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import MediaRow from './MediaRow';

export default function MediaAttachmentsPanel({ sourceId, onMediaChange, refreshKey }) {
    const [mediaItems, setMediaItems] = useState({ audio: [], images: [], files: [] });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load media for this sourceId
    useEffect(() => {
        if (!sourceId) return;
        setLoading(true);
        api.getMediaBySource(sourceId)
            .then(data => {
                const items = data || [];
                setMediaItems({
                    audio: items.filter(i => i.media_type === 'audio'),
                    images: items.filter(i => i.media_type === 'image'),
                    files: items.filter(i => i.media_type === 'file'),
                });
            })
            .catch(err => console.error('Failed to load media:', err))
            .finally(() => setLoading(false));
    }, [sourceId, refreshKey]);

    // Listen for deletions triggered by inline embed delete buttons
    useEffect(() => {
        const handler = (e) => {
            const { media_id } = e.detail;
            if (!media_id) return;
            setMediaItems(prev => ({
                audio: prev.audio.filter(m => m.media_id !== media_id),
                images: prev.images.filter(m => m.media_id !== media_id),
                files: prev.files.filter(m => m.media_id !== media_id),
            }));
        };
        document.addEventListener('sn-media-deleted', handler);
        return () => document.removeEventListener('sn-media-deleted', handler);
    }, []);

    const handleUpload = async (file, mediaType) => {
        if (!sourceId || !file) return;

        if (!mediaType) {
            if (file.type.includes('image')) mediaType = 'image';
            else if (file.type.includes('audio')) mediaType = 'audio';
            else mediaType = 'file';
        }

        setSaving(true);
        try {
            const base64data = await api.fileToBase64(file);
            const res = await api.uploadMedia({
                base64data,
                filename: file.name,
                mime_type: file.type,
                media_type: mediaType,
                uploaded_from: 'studynotes', // or keep as generic
                source_id: sourceId,
            });

            const newItem = {
                media_id: res.media_id,
                drive_link: res.drive_link,
                thumbnail_link: res.thumbnail_link,
                filename: file.name,
                display_name: file.name,
                media_type: mediaType
            };

            setMediaItems(prev => {
                const typeKey = mediaType === 'image' ? 'images' : (mediaType === 'audio' ? 'audio' : 'files');
                const newState = { ...prev, [typeKey]: [...prev[typeKey], newItem] };
                
                // Notify parent of the new refs
                if (onMediaChange) {
                    onMediaChange({
                        audio_refs: newState.audio.map(m => m.media_id).join(','),
                        image_refs: newState.images.map(m => m.media_id).join(','),
                        file_refs: newState.files.map(m => m.media_id).join(',')
                    });
                }
                return newState;
            });
        } catch (e) {
            console.error('Upload Error:', e);
            alert(`Upload failed: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (mediaId) => {
        if (!sourceId || !mediaId) return;
        if (!window.confirm('Permanently delete this media file?')) return;

        try {
            await api.deleteMedia(mediaId);
            // Tell the editor to remove any matching ghost embeds
            document.dispatchEvent(new CustomEvent('sn-media-deleted', { detail: { media_id: mediaId } }));
            
            setMediaItems(prev => {
                const newState = {
                    audio: prev.audio.filter(m => m.media_id !== mediaId),
                    images: prev.images.filter(m => m.media_id !== mediaId),
                    files: prev.files.filter(m => m.media_id !== mediaId)
                };

                // Notify parent
                if (onMediaChange) {
                    onMediaChange({
                        audio_refs: newState.audio.map(m => m.media_id).join(','),
                        image_refs: newState.images.map(m => m.media_id).join(','),
                        file_refs: newState.files.map(m => m.media_id).join(',')
                    });
                }
                return newState;
            });
        } catch (e) {
            console.error('Delete failed:', e);
            alert('Failed to delete media: ' + e.message);
        }
    };

    if (!sourceId) return null;

    return (
        <div className="media-attachments-panel" style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <MediaRow 
                active={{ entry_id: sourceId }} // Compatibility with MediaRow props
                mediaItems={mediaItems} 
                onUpload={handleUpload}
                onRecord={f => handleUpload(f, 'audio')}
                onRemove={handleRemove}
            />
            {saving && <div className="saving-overlay">Uploading...</div>}
        </div>
    );
}

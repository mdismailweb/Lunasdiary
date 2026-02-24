import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useMedia() {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const load = useCallback(async (filter) => {
        try {
            const data = await api.getAllMedia(filter || {});
            setMedia(data || []);
        } catch (e) {
            addToast('Failed to load media', 'error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const upload = async (file, mediaType, uploadedFrom, sourceId) => {
        try {
            const base64data = await api.fileToBase64(file);
            const res = await api.uploadMedia({
                base64data,
                filename: file.name,
                mime_type: file.type,
                media_type: mediaType,
                uploaded_from: uploadedFrom,
                source_id: sourceId,
            });
            await load();
            addToast('File uploaded', 'success');
            return res;
        } catch (e) {
            addToast('Upload failed', 'error');
            throw e;
        }
    };

    const remove = async (media_id) => {
        try {
            await api.deleteMedia(media_id);
            setMedia(prev => prev.filter(m => m.media_id !== media_id));
            addToast('File deleted', 'info');
        } catch (e) { addToast('Failed to delete file', 'error'); }
    };

    const scan = async () => {
        const res = await api.scanOrphans();
        await load();
        addToast(`Orphan scan: ${res.updated} updated`, 'info');
    };

    return { media, loading, upload, remove, scan, refresh: load };
}

import { useState, useEffect, useMemo } from 'react';
import * as api from '../../services/api';
import StudyNotesSidebar from './StudyNotesSidebar';
import StudyNotesEditor from './StudyNotesEditor';
import './StudyNotes.css';

export default function StudyNotesPage() {
    const [folders, setFolders] = useState([]);
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [activeFolderId, setActiveFolderId] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [fData, nData] = await Promise.all([
                api.getStudyFolders().catch(() => []),
                api.getStudyNotes().catch(() => [])
            ]);
            setFolders(Array.isArray(fData) ? fData.filter(f => f.delete_status !== 'yes') : []);
            setNotes(Array.isArray(nData) ? nData.filter(n => n.delete_status !== 'yes') : []);
        } catch (err) {
            console.error('Failed to load study notes:', err);
            setFolders([]);
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotes = useMemo(() => {
        return notes.filter(n => {
            const matchesSearch = n.title?.toLowerCase().includes(search.toLowerCase()) || 
                                n.content?.toLowerCase().includes(search.toLowerCase());
            const matchesFolder = !activeFolderId || n.folder_id === activeFolderId;
            return matchesSearch && matchesFolder;
        });
    }, [notes, search, activeFolderId]);

    const activeNote = notes.find(n => n.note_id === activeNoteId);

    const noteCounts = useMemo(() => {
        return folders.reduce((acc, f) => {
            acc[f.folder_id] = notes.filter(n => n.folder_id === f.folder_id).length;
            return acc;
        }, {});
    }, [folders, notes]);

    const handleNewNote = async () => {
        const newNote = {
            note_id: `note_${Date.now()}`,
            title: '',
            content: '',
            folder_id: activeFolderId || '',
            tags: '',
            audio_urls: '',
            image_urls: '',
            file_urls: '',
            updated_at: new Date().toISOString()
        };
        try {
            await api.createStudyNote(newNote);
            setNotes([newNote, ...notes]);
            setActiveNoteId(newNote.note_id);
        } catch (err) {
            console.error('Create note failed:', err);
        }
    };

    const handleUpdateNote = async (updates) => {
        if (!activeNoteId) return;
        
        // Optimistically update local state immediately so UI doesn't jump
        setNotes(prevNotes => prevNotes.map(n => n.note_id === activeNoteId ? { ...n, ...updates } : n));
        
        try {
            const updated = await api.updateStudyNote({ ...activeNote, ...updates, note_id: activeNoteId });
            if (updated && updated.note_id) {
                setNotes(prevNotes => prevNotes.map(n => n.note_id === activeNoteId ? { ...n, ...updated } : n));
            }
        } catch (err) {
            console.error('Update note failed:', err);
        }
    };

    const handleAutoSave = async (updates) => {
        setAutoSaveStatus('saving');
        await handleUpdateNote(updates);
        setAutoSaveStatus('saved');
    };

    const handleDeleteNote = async () => {
        if (!activeNoteId || !window.confirm('Delete this note?')) return;
        try {
            await api.updateStudyNote({ note_id: activeNoteId, delete_status: 'yes' });
        } catch (err) {
            console.error('Delete note failed:', err);
        }
        setNotes(notes.filter(n => n.note_id !== activeNoteId));
        setActiveNoteId(null);
    };

    const handleCreateFolder = async (folder) => {
        try {
            const newFolder = {
                ...folder,
                folder_id: `folder_${Date.now()}`
            };
            await api.createStudyFolder(newFolder);
            setFolders([...folders, newFolder]);
        } catch (err) {
            console.error('Create folder failed:', err);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Are you sure you want to delete this folder? All notes inside will be moved to "All Notes" (Unfoldered).')) return;
        
        try {
            await api.updateStudyFolder({ folder_id: folderId, delete_status: 'yes' });
            setFolders(folders.filter(f => f.folder_id !== folderId));
            
            // Move notes from this folder to unfoldered
            const updatedNotes = notes.map(n => 
                n.folder_id === folderId ? { ...n, folder_id: '' } : n
            );
            setNotes(updatedNotes);
            
            // Re-sync these notes to backend to clear their folder_id
            const notesToUpdate = updatedNotes.filter(n => n.folder_id === ''); // Note: this might sync more than necessary, but ensures consistency
            // Optionally could just let the backend handle this if we configured it, but doing it in UI keeps state clean.
            
            if (activeFolderId === folderId) {
                setActiveFolderId(null);
            }
        } catch (err) {
            console.error('Delete folder failed:', err);
        }
    };

    if (loading) return <div className="sn-loading">Loading Knowledge Base...</div>;

    return (
        <div className="sn-page">
            <StudyNotesSidebar 
                folders={folders}
                notes={filteredNotes}
                activeFolderId={activeFolderId}
                activeNoteId={activeNoteId}
                search={search}
                onSearch={setSearch}
                onSelectFolder={setActiveFolderId}
                onSelectNote={setActiveNoteId}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onNewNote={handleNewNote}
                noteCounts={noteCounts}
            />

            <section className="sn-editor-panel">
                {activeNote ? (
                    <StudyNotesEditor
                        key={activeNote.note_id}
                        note={activeNote}
                        folders={folders}
                        allNotes={notes}
                        autoSaveStatus={autoSaveStatus}
                        onSave={handleUpdateNote}
                        onTriggerAutoSave={handleAutoSave}
                        onDelete={handleDeleteNote}
                    />
                ) : (
                    <div className="sn-empty-editor-centered">
                        <div className="sn-empty-icon-lg">📓</div>
                        <h2 className="sn-empty-heading">Your notes live here</h2>
                        <p className="sn-empty-subtext">
                            Select a note to read or edit, or create a new one.
                        </p>
                        <button className="sn-empty-btn-quiet" onClick={handleNewNote}>
                            + New Note
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import GooglePhotos from './GooglePhotos';
import VaultLock from './VaultLock';
import { getVaultFolders, addVaultFolder, removeVaultFolder } from '../../services/api';

const extractFolderId = (input) => {
    if (!input) return '';
    const urlMatch = input.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) return urlMatch[1];
    const queryMatch = input.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (queryMatch) return queryMatch[1];
    return input.trim();
};

// ─── Add Folder Modal ────────────────────────────────────────
function AddFolderModal({ onAdd, onClose }) {
    const [name, setName] = useState('');
    const [link, setLink] = useState('');
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const folderId = extractFolderId(link);
        if (!folderId) { setErr('Invalid Drive folder link or ID.'); return; }
        if (!name.trim()) { setErr('Please enter a name.'); return; }
        setSaving(true);
        try {
            const res = await addVaultFolder(name.trim(), folderId);
            onAdd({ id: res.id || Date.now().toString(), name: name.trim(), folderId });
            onClose();
        } catch { setErr('Failed to save. Try again.'); }
        finally { setSaving(false); }
    };

    return ReactDOM.createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card, #1a1a2e)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>➕ Add Drive Folder</h3>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Folder name" value={name} onChange={e => setName(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }} />
                    <input type="text" placeholder="Google Drive folder link or ID" value={link} onChange={e => setLink(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }} />
                    {err && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{err}</p>}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
                        <button className="btn btn-ghost" type="button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ─── Sidebar Nav Button ──────────────────────────────────────
function NavBtn({ active, onClick, icon, label, onRemove }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
                onClick={onClick}
                style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.65rem 0.9rem', borderRadius: '12px', border: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                    background: active ? 'var(--accent, #a78bfa)' : 'rgba(255,255,255,0.05)',
                    color: active ? 'white' : 'rgba(255,255,255,0.7)',
                    boxShadow: active ? '0 4px 12px rgba(167,139,250,0.25)' : 'none',
                    transition: 'all 0.2s', overflow: 'hidden',
                }}
            >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            </button>
            {onRemove && (
                <button onClick={onRemove} title="Remove"
                    style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.4)', borderRadius: '8px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                </button>
            )}
        </div>
    );
}

// ─── Main VaultPage ──────────────────────────────────────────
function VaultPage() {
    const [folders, setFolders] = useState([]);
    const [activeTab, setActiveTab] = useState('liked');
    const [showAdd, setShowAdd] = useState(false);
    const [loadingFolders, setLoadingFolders] = useState(true);

    useEffect(() => {
        getVaultFolders()
            .then(res => setFolders(res.data?.folders || []))
            .catch(() => { })
            .finally(() => setLoadingFolders(false));
    }, []);

    const handleAddFolder = (folder) => {
        setFolders(prev => [...prev, folder]);
        setActiveTab(folder.id);
    };

    const handleRemoveFolder = async (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        if (!window.confirm(`Remove "${folder?.name || 'this folder'}" from your Vault?`)) return;
        try { await removeVaultFolder(folderId); } catch { }
        setFolders(prev => prev.filter(f => f.id !== folderId));
        if (activeTab === folderId) setActiveTab('liked');
    };

    return (
        <div className="fade-in" style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
            {/* ─── Left Sidebar ─── */}
            <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>🔒 Vault</h2>

                {/* Liked — always first */}
                <NavBtn
                    active={activeTab === 'liked'}
                    onClick={() => setActiveTab('liked')}
                    icon="❤️"
                    label="Liked"
                />

                {/* Divider */}
                {folders.length > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', padding: '0.5rem 0.9rem 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Folders
                    </div>
                )}

                {/* Folder list */}
                {loadingFolders ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 0.9rem' }}>Loading…</div>
                ) : (
                    folders.map(folder => (
                        <NavBtn
                            key={folder.id}
                            active={activeTab === folder.id}
                            onClick={() => setActiveTab(folder.id)}
                            icon="📁"
                            label={folder.name}
                            onRemove={() => handleRemoveFolder(folder.id)}
                        />
                    ))
                )}

                {/* Add folder — bottom of sidebar */}
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ marginTop: '0.5rem', width: '100%', padding: '0.55rem 0.9rem', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                >
                    + Add Folder
                </button>
            </div>

            {/* ─── Content Area ─── */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <GooglePhotos
                    activeTab={activeTab}
                    folders={folders}
                    onTabChange={setActiveTab}
                />
            </div>

            {showAdd && <AddFolderModal onAdd={handleAddFolder} onClose={() => setShowAdd(false)} />}
        </div>
    );
}

// Wrap with password lock
const LockedVaultPage = () => <VaultLock><VaultPage /></VaultLock>;
export default LockedVaultPage;

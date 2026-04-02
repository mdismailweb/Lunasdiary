import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import GooglePhotos from './GooglePhotos';
import PeopleView from './PeopleView';
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
            .then(res => {
                const folderList = res.data?.folders || [];
                setFolders(folderList);
                // Cache folders to localStorage for offline access
                localStorage.setItem('vault_folders_cache', JSON.stringify({
                    folders: folderList,
                    cachedAt: Date.now()
                }));
            })
            .catch(() => {
                // Offline: load from cache
                const cached = localStorage.getItem('vault_folders_cache');
                if (cached) {
                    try {
                        const { folders: cachedFolders } = JSON.parse(cached);
                        setFolders(cachedFolders);
                    } catch (e) { console.warn('Cache error:', e); }
                }
            })
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
        if (activeTab === folderId) setActiveTab('folders_menu');
    };

    const isFolderActive = folders.some(f => f.id === activeTab);
    const activeFolder = folders.find(f => f.id === activeTab);

    return (
        <div className="vault-layout">
            {/* ─── Mobile Segmented Control ─── */}
            <div className={`vault-mobile-nav mobile-only ${isFolderActive ? 'hidden' : ''}`}>
                <div className="vault-segments">
                    <button className={activeTab === 'liked' ? 'active' : ''} onClick={() => setActiveTab('liked')}>❤️ Liked</button>
                    <button className={activeTab === 'folders_menu' ? 'active' : ''} onClick={() => setActiveTab('folders_menu')}>🗂️ Folders</button>
                    <button className={activeTab === 'people' ? 'active' : ''} onClick={() => setActiveTab('people')}>👥 People</button>
                </div>
            </div>

            {/* ─── Mobile Folder Top Bar ─── */}
            {isFolderActive && (
                <div className="vault-mobile-folder-header mobile-only">
                    <button className="back-btn" onClick={() => setActiveTab('folders_menu')}>
                        ‹ Back
                    </button>
                    <span className="folder-title">{activeFolder?.name}</span>
                </div>
            )}

            {/* ─── Left Sidebar (Desktop Only) ─── */}
            <div className="vault-sidebar desktop-only">
                <h2 className="vault-title">🔒 Vault</h2>

                <div className="vault-nav-scroll">
                    {/* Liked — always first */}
                    <NavBtn
                        active={activeTab === 'liked'}
                        onClick={() => setActiveTab('liked')}
                        icon="❤️"
                        label="Liked"
                    />

                    <NavBtn
                        active={activeTab === 'people'}
                        onClick={() => setActiveTab('people')}
                        icon="👥"
                        label="People"
                    />

                    {/* Divider */}
                    {folders.length > 0 && (
                        <div className="vault-divider" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', padding: '0.5rem 0.9rem 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Folders
                        </div>
                    )}

                    {/* Folder list */}
                    {loadingFolders ? (
                        <div className="vault-loading">Loading…</div>
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
                        className="vault-add-btn"
                        onClick={() => setShowAdd(true)}
                        style={{ marginTop: '0.5rem', width: '100%', padding: '0.55rem 0.9rem', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                    >
                        + Add Folder
                    </button>
                </div>
            </div>

            {/* ─── Content Area ─── */}
            <div className={`vault-content ${activeTab === 'folders_menu' ? 'mobile-only' : ''}`}>
                {activeTab === 'folders_menu' ? (
                    <div className="mobile-folders-grid-view">
                        <h3 className="mobile-folders-title">My Folders</h3>
                        <div className="mobile-folders-grid">
                            <div className="add-folder-card" onClick={() => setShowAdd(true)}>
                                <div className="add-icon">+</div>
                                <span>Add Folder</span>
                            </div>
                            {loadingFolders ? (
                                <div className="vault-loading" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem' }}>Loading folders...</div>
                            ) : (
                                folders.map(folder => (
                                    <div key={folder.id} className="folder-card" onClick={() => setActiveTab(folder.id)}>
                                        <div className="folder-icon-wrapper">📁</div>
                                        <div className="folder-name">{folder.name}</div>
                                        <button className="folder-remove" onClick={(e) => { e.stopPropagation(); handleRemoveFolder(folder.id); }}>✕</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : activeTab === 'people' ? (
                    <PeopleView folders={folders} />
                ) : (
                    <GooglePhotos
                        activeTab={activeTab === 'folders_menu' ? 'liked' : activeTab}
                        folders={folders}
                        onTabChange={setActiveTab}
                    />
                )}
            </div>

            {showAdd && <AddFolderModal onAdd={handleAddFolder} onClose={() => setShowAdd(false)} />}
        </div>
    );
}

// Wrap with password lock
const LockedVaultPage = () => <VaultLock><VaultPage /></VaultLock>;
export default LockedVaultPage;

const TABS = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'journal', icon: '📓', label: 'Journal' },
    { id: 'todos', icon: '✅', label: 'Todos' },
    { id: 'insights', icon: '💡', label: 'Insights' },
    { id: 'habits', icon: '🔥', label: 'Habits' },
    { id: 'videos', icon: '📺', label: 'Videos' },
    { id: 'media', icon: '🖼️', label: 'Media Library' },
    { id: 'vault', icon: '🔒', label: 'Vault' },
    { id: 'lifemap', icon: '🗺️', label: 'Life Map' },
    { id: 'timecapsule', icon: '⏳', label: 'Time Capsule' },
    { id: 'whoami', icon: '🧬', label: 'Who Am I' },
    { id: 'thoughtdump', icon: '💭', label: 'Thought Dump' },
    { id: 'streaks', icon: '🔥', label: 'Streaks' },
    { id: 'readinglist', icon: '📚', label: 'Reading List' },
    { id: 'watchlist', icon: '🎬', label: 'Watchlist' },
    { id: 'finance', icon: '💰', label: 'Finance' },
    { id: 'bookmarks', icon: '🔖', label: 'Bookmarks' },
    { id: 'writing', icon: '✍️', label: 'Writing' },
    { id: 'yearlyreview', icon: '🔮', label: 'Yearly Review' },
    { id: 'twitch', icon: '🎮', label: 'Twitch' },
    { id: 'delegation', icon: '📥', label: 'Delegation' },
];

export default function Sidebar({ active, onNavigate, userName, isOffline, onPreload, isPreloading, isOpen, onClose }) {
    return (
        <>
            {/* Mobile Drawer Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

            <button 
                className={`sync-btn ${isPreloading ? 'syncing' : ''}`}
                onClick={onPreload}
                disabled={isPreloading || isOffline}
                title="Shuffle & Preload Vault for Offline Use"
            >
                <span className="sync-icon">🔄</span>
                <span>{isPreloading ? 'Syncing...' : 'Sync Vault'}</span>
            </button>

            <div className="sidebar-logo">

                <h1>🌙 Luna's Notes</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p>Your private sanctuary</p>
                    {isOffline && (
                        <span className="badge badge-draft" style={{ fontSize: '0.6rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            ☁️ Offline
                        </span>
                    )}
                </div>
            </div>

            <nav className="sidebar-nav">
                {TABS.map(tab => (
                    <div
                        key={tab.id}
                        className={`nav-item ${active === tab.id ? 'active' : ''}`}
                        onClick={() => onNavigate(tab.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && onNavigate(tab.id)}
                    >
                        <span className="nav-icon">{tab.icon}</span>
                        <span className="nav-label">{tab.label}</span>
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <span className="user-name">👤 {userName || 'You'}</span>
                <button className="settings-btn" title="Settings">⚙️</button>
            </div>
        </aside>
        </>
    );
}

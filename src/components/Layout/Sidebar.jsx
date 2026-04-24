import { useAudio } from '../../context/AudioContext';

const TABS = [
    { id: 'dashboard', icon: '🌸', label: 'Dashboard' },
    { id: 'journal', icon: '📖', label: 'Journal' },
    { id: 'todos', icon: '🎯', label: 'Todos' },
    { id: 'insights', icon: '✨', label: 'Insights' },
    { id: 'habits', icon: '💕', label: 'Habits' },
    { id: 'videos', icon: '🎬', label: 'Videos' },
    { id: 'media', icon: '🎨', label: 'Media Library' },
    { id: 'vault', icon: '💎', label: 'Vault' },
    { id: 'lifemap', icon: '🧭', label: 'Life Map' },
    { id: 'timecapsule', icon: '📦', label: 'Time Capsule' },
    { id: 'whoami', icon: '🌙', label: 'Who Am I' },
    { id: 'thoughtdump', icon: '🌊', label: 'Thought Dump' },
    { id: 'streaks', icon: '🌟', label: 'Streaks' },
    { id: 'readinglist', icon: '📚', label: 'Reading List' },
    { id: 'watchlist', icon: '🎞️', label: 'Watchlist' },
    { id: 'finance', icon: '💳', label: 'Finance' },
    { id: 'bookmarks', icon: '❤️', label: 'Bookmarks' },
    { id: 'writing', icon: '✍️', label: 'Writing' },
    { id: 'studynotes', icon: '📝', label: 'Study Notes' },
    { id: 'yearlyreview', icon: '🎆', label: 'Yearly Review' },
    { id: 'twitch', icon: '🎮', label: 'Twitch' },
    { id: 'delegation', icon: '🤝', label: 'Delegation' },
    { id: 'information', icon: '📰', label: 'Information' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
];

export default function Sidebar({ active, onNavigate, userName, isOffline, onPreload, preload, isOpen, onClose, onMusicClick }) {
    const { playing } = useAudio();

    return (
        <>
            {/* Mobile Drawer Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

            <div className="sidebar-logo">
                <div className="logo-flex">
                    <img src="/profile.jpg" alt="Logo" className="app-logo-img" />
                    <div className="logo-text">
                        <h1>Luna's Notes</h1>
                        <p>Your private sanctuary</p>
                    </div>
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
                <div className="user-profile-stack">
                    <img src="/profile.jpg" alt="Profile" className="profile-avatar-xs" />
                    <span className="user-name">{userName || 'You'}</span>
                </div>
                <div className="sidebar-footer-actions">
                    <button 
                        className={`sidebar-music-btn ${playing ? 'is-playing' : ''}`} 
                        onClick={onMusicClick}
                        title="Music Player"
                    >
                        💿
                    </button>
                    <button className="settings-btn" title="Settings">⚙️</button>
                </div>
            </div>
        </aside>
        </>
    );
}

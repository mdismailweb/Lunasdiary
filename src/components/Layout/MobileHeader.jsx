import React from 'react';

/**
 * MobileHeader - Top Header for branding and status
 */
export default function MobileHeader({ userName, isOffline }) {
    return (
        <header className="mobile-header">
            <div className="mobile-header-branding">
                <img src="/profile.jpg?v=2" alt="Logo" className="mobile-logo-img" />
                <span className="mobile-header-title">Luna's Notes</span>
            </div>
            
            <div className="mobile-header-status">
                {isOffline && <span className="status-badge offline">☁️ Offline</span>}
                <img src="/profile.jpg?v=2" alt="User" className="mobile-user-avatar-img" />
            </div>
        </header>
    );
}

import { useState, useEffect } from 'react';
import AppShell from './components/Layout/AppShell';
import Dashboard from './components/Dashboard/Dashboard';
import JournalPage from './components/Journal/JournalPage';
import TodosPage from './components/Todos/TodosPage';
import InsightsPage from './components/Insights/InsightsPage';
import HabitsPage from './components/Habits/HabitsPage';
import MediaLibraryPage from './components/MediaLibrary/MediaLibraryPage';
import Videos from './components/Videos/Videos';
import VaultPage from './components/Vault/VaultPage';
import LifeMapPage from './components/LifeMap/LifeMapPage';
import TimeCapsulePage from './components/TimeCapsule/TimeCapsulePage';
import WhoAmIPage from './components/WhoAmI/WhoAmIPage';
import ThoughtDumpPage from './components/ThoughtDump/ThoughtDumpPage';
import StreaksPage from './components/Streaks/StreaksPage';
import ReadingListPage from './components/ReadingList/ReadingListPage';
import WatchlistPage from './components/Watchlist/WatchlistPage';
import FinancePage from './components/Finance/FinancePage';
import BookmarksPage from './components/Bookmarks/BookmarksPage';
import WritingPage from './components/Writing/WritingPage';
import YearlyReviewPage from './components/YearlyReview/YearlyReviewPage';
import TwitchPage from './components/Twitch/TwitchPage';
import DelegationPage from './components/Delegation/DelegationPage';
import NotificationsPage from './components/Notifications/NotificationsPage';
import * as api from './services/api';
import { Preloader } from './services/preloader';
import { OfflineCache } from './services/offlineCache';
import OfflineCacheBadge from './components/OfflineCacheBadge';

export default function App() {
    const [tab, setTab] = useState(() => localStorage.getItem('luna_active_tab') || 'dashboard');
    const [userName, setUserName] = useState('');
    const [theme, setTheme] = useState('dark');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [preload, setPreload] = useState({ active: false, current: 0, total: 0, status: '' });

    const triggerPreload = () => {
        if (preload.active) return;
        setPreload({ active: true, current: 0, total: 0 });
        Preloader.start((current, total, status) => {
            setPreload({ active: current < total, current, total, status });
        });
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Trigger background cache sync when coming online
            OfflineCache.triggerSync();
        };

        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Initialize offline cache monitoring
        const cleanupCache = OfflineCache.init();
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            cleanupCache?.();
        };
    }, []);

    useEffect(() => {
        // Load config on mount
        api.getDashboardStats()
            .then(data => {
                if (data?.config?.user_name) setUserName(data.config.user_name);
                if (data?.config?.theme) {
                    setTheme(data.config.theme);
                    document.documentElement.setAttribute('data-theme', data.config.theme);
                }
            })
            .catch(() => { });
    }, []);

    const navigate = (tabId) => {
        setTab(tabId);
        localStorage.setItem('luna_active_tab', tabId);
    };

    const renderTab = () => {
        switch (tab) {
            case 'dashboard': return <Dashboard onNavigate={navigate} />;
            case 'journal': return <JournalPage />;
            case 'todos': return <TodosPage />;
            case 'insights': return <InsightsPage />;
            case 'habits': return <HabitsPage />;
            case 'videos': return <Videos />;
            case 'media': return <MediaLibraryPage />;
            case 'vault': return <VaultPage />;
            case 'lifemap': return <LifeMapPage />;
            case 'timecapsule': return <TimeCapsulePage />;
            case 'whoami': return <WhoAmIPage />;
            case 'thoughtdump': return <ThoughtDumpPage />;
            case 'streaks': return <StreaksPage />;
            case 'readinglist': return <ReadingListPage />;
            case 'watchlist': return <WatchlistPage />;
            case 'finance': return <FinancePage />;
            case 'bookmarks': return <BookmarksPage />;
            case 'writing': return <WritingPage />;
            case 'yearlyreview': return <YearlyReviewPage />;
            case 'twitch': return <TwitchPage />;
            case 'delegation': return <DelegationPage />;
            case 'notifications': return <NotificationsPage />;
            default: return <Dashboard onNavigate={navigate} />;
        }
    };

    return (
        <>
            <AppShell 
                activeTab={tab} 
                onNavigate={navigate} 
                userName={userName} 
                isOffline={isOffline} 
                preload={preload}
                onPreload={triggerPreload}
            >
                {renderTab()}
            </AppShell>
            <OfflineCacheBadge />
        </>
    );
}

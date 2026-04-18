import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import '../../styles/Information.css';

const PROXY = 'https://corsproxy.io/?';

export default function InformationPage() {
    const [feeds, setFeeds] = useState([]);
    const [activeFeed, setActiveFeed] = useState(null);
    const [articles, setArticles] = useState([]);
    const [activeArticle, setActiveArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchingFeed, setFetchingFeed] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFeed, setNewFeed] = useState({ name: '', url: '', category: 'Technology', icon: '📰' });
    const [error, setError] = useState('');

    // Load feeds from Google Sheets
    const loadFeeds = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getRssFeeds();
            setFeeds(data || []);
            if (data?.length > 0 && !activeFeed) {
                setActiveFeed(data[0]);
            }
        } catch (err) {
            console.error('Failed to load feeds:', err);
            setError('Could not sync with Google Sheets.');
        } finally {
            setLoading(false);
        }
    }, [activeFeed]);

    useEffect(() => {
        loadFeeds();
    }, [loadFeeds]);

    // Fetch and parse RSS
    const fetchArticles = useCallback(async (feed) => {
        if (!feed?.url) return;
        setFetchingFeed(true);
        setArticles([]);
        try {
            const response = await fetch(`${PROXY}${encodeURIComponent(feed.url)}`);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            
            const items = Array.from(xml.querySelectorAll('item, entry')).map(item => {
                const title = item.querySelector('title')?.textContent || 'Untitled';
                let link = '';
                const linkElem = item.querySelector('link');
                if (linkElem) {
                    link = linkElem.getAttribute('href') || linkElem.textContent || '#';
                }
                
                const description = item.querySelector('description, summary, content')?.textContent || '';
                const pubDate = item.querySelector('pubDate, published, updated, date')?.textContent || '';
                
                // Content:encoded usually has the full article HTML in RSS feeds
                let fullContent = item.getElementsByTagName('content:encoded');
                let htmlContent = fullContent.length > 0 ? fullContent[0].textContent : description;
                
                // Try to find an image
                let image = '';
                const enclosure = item.querySelector('enclosure[type^="image"]');
                if (enclosure) image = enclosure.getAttribute('url');
                
                // Strip HTML from description for the snippet
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = description;
                const snippet = tempDiv.textContent || tempDiv.innerText || '';

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    title,
                    link,
                    snippet: snippet.slice(0, 180) + (snippet.length > 180 ? '...' : ''),
                    fullHtml: htmlContent,
                    date: pubDate ? new Date(pubDate).toLocaleDateString() : 'Recent',
                    image
                };
            });

            setArticles(items);
        } catch (err) {
            console.error('Failed to fetch RSS:', err);
            setError('Could not fetch this feed. It might be blocked or invalid.');
        } finally {
            setFetchingFeed(false);
        }
    }, []);

    useEffect(() => {
        if (activeFeed) {
            fetchArticles(activeFeed);
        }
    }, [activeFeed, fetchArticles]);

    const handleAddFeed = async (e) => {
        e.preventDefault();
        try {
            const saved = await api.saveRssFeed(newFeed);
            setFeeds(prev => [...prev, saved]);
            setIsModalOpen(false);
            setNewFeed({ name: '', url: '', category: 'Technology', icon: '📰' });
        } catch (err) {
            console.error('Save feed error:', err);
        }
    };

    const handleRemoveFeed = async (id) => {
        if (!window.confirm('Remove this feed?')) return;
        try {
            await api.removeRssFeed(id);
            setFeeds(prev => prev.filter(f => f.id !== id));
            if (activeFeed?.id === id) setActiveFeed(null);
        } catch (err) {
            console.error('Remove feed error:', err);
        }
    };

    if (loading) {
        return (
            <div className="empty-feed">
                <div className="spinner" />
                <p>Syncing your feeds...</p>
            </div>
        );
    }

    return (
        <div className="information-layout">
            <aside className="information-sidebar">
                <div className="inf-header">
                    <h2 className="inf-section-title">Sources</h2>
                    <button className="add-feed-btn" onClick={() => setIsModalOpen(true)}>
                        <span>+</span> Add Feed
                    </button>
                </div>

                <div className="rss-source-list">
                    {['Technology', 'Science', 'Other'].map(cat => {
                        const catFeeds = feeds.filter(f => f.category === cat);
                        if (catFeeds.length === 0) return null;
                        return (
                            <div key={cat} style={{ marginBottom: '1rem' }}>
                                <div className="inf-section-title" style={{ fontSize: '0.7rem', opacity: 0.5 }}>{cat}</div>
                                {catFeeds.map(f => (
                                    <div 
                                        key={f.id} 
                                        className={`rss-source-item ${activeFeed?.id === f.id ? 'active' : ''}`}
                                        onClick={() => setActiveFeed(f)}
                                    >
                                        <span className="rss-source-icon">{f.icon || '📰'}</span>
                                        <span className="rss-source-name">{f.name}</span>
                                        <button 
                                            className="card-remove" 
                                            style={{ marginLeft: 'auto', fontSize: '10px' }}
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFeed(f.id); }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </aside>

            <main className="information-main">
                {activeFeed ? (
                    <>
                        <header className="feed-header">
                            <div className="feed-title-wrap">
                                <h2>{activeFeed.name}</h2>
                                <p className="feed-meta">{activeFeed.category} • {articles.length} articles found</p>
                            </div>
                            {fetchingFeed && <div className="spinner-sm" />}
                        </header>

                        <div className="feed-content">
                            {fetchingFeed ? (
                                <div className="feed-grid">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="article-card skeleton-card">
                                            <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 10 }} />
                                            <div className="skeleton" style={{ height: 24, width: '90%', marginBottom: 10 }} />
                                            <div className="skeleton" style={{ height: 60, width: '100%' }} />
                                        </div>
                                    ))}
                                </div>
                            ) : articles.length > 0 ? (
                                <div className="feed-grid fade-in">
                                    {articles.map(article => (
                                        <div 
                                            key={article.id} 
                                            onClick={() => setActiveArticle(article)}
                                            className="article-card"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="article-tag">{activeFeed.name}</span>
                                            <h3 className="article-title">{article.title}</h3>
                                            <p className="article-snippet">{article.snippet}</p>
                                            <div className="article-footer">
                                                <span className="article-date">📅 {article.date}</span>
                                                <span className="read-more">Read in App →</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-feed">
                                    <span className="empty-icon">📭</span>
                                    <p>No articles found in this feed.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-feed">
                        <span className="empty-icon">📰</span>
                        <h3>Welcome to Information</h3>
                        <p>Select a source on the left to start reading.</p>
                    </div>
                )}
            </main>

            {/* Add Feed Modal */}
            {isModalOpen && (
                <div className="inf-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="inf-modal" onClick={e => e.stopPropagation()}>
                        <h3>Add New RSS Feed</h3>
                        <form onSubmit={handleAddFeed}>
                            <div className="inf-form-group">
                                <label>Feed Name</label>
                                <input 
                                    className="inf-input" 
                                    value={newFeed.name} 
                                    onChange={e => setNewFeed({...newFeed, name: e.target.value})}
                                    placeholder="e.g. The Verge" 
                                    required 
                                />
                            </div>
                            <div className="inf-form-group">
                                <label>RSS URL</label>
                                <input 
                                    className="inf-input" 
                                    value={newFeed.url} 
                                    onChange={e => setNewFeed({...newFeed, url: e.target.value})}
                                    placeholder="https://example.com/rss" 
                                    required 
                                />
                            </div>
                            <div className="inf-form-group">
                                <label>Category</label>
                                <select 
                                    className="inf-input" 
                                    value={newFeed.category} 
                                    onChange={e => setNewFeed({...newFeed, category: e.target.value})}
                                >
                                    <option value="Technology">Technology</option>
                                    <option value="Science">Science</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="inf-modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Feed</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Article Viewer Modal */}
            {activeArticle && (
                <div className="article-viewer-overlay">
                    <div className="article-viewer-header">
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveArticle(null)}>
                            ← Back to Feed
                        </button>
                        <div className="article-viewer-title">{activeArticle.title}</div>
                        <div className="article-viewer-actions">
                            <a href={activeArticle.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                                Open in Browser ↗
                            </a>
                        </div>
                    </div>
                    <div className="article-viewer-body">
                        <div 
                            className="article-reader-content fade-in" 
                            dangerouslySetInnerHTML={{ __html: activeArticle.fullHtml }} 
                        />
                    </div>
                </div>
            )}

            {error && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#ef4444', color: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', zIndex: 3000 }}>
                    {error}
                    <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
                </div>
            )}
        </div>
    );
}

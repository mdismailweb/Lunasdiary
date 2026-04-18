import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse } from '../../services/gemini';
import '../../styles/AIChatSidebar.css';

const GeminiIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#gemini-grad)" />
        <defs>
            <linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#818cf8" />
            </linearGradient>
        </defs>
    </svg>
);

const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export default function AIChatSidebar({ article, articleHtml, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [articleContext, setArticleContext] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            setMessages([]);
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = articleHtml || article.snippet;
                const rawText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                setArticleContext(rawText);

                const initialPrompt = `You are Luna, an intelligent AI reading assistant embedded in a personal journal app called Lunasdiary. A user has opened an article and wants a smart summary.\n\nArticle Title: "${article.title}"\n\nArticle Content:\n${rawText.slice(0, 40000)}\n\n---\n\nPlease provide:\n1. A 2-3 sentence **TL;DR** at the top\n2. **Key Takeaways** as a bulleted list (5-7 points)\n3. A brief **Why It Matters** paragraph\n\nKeep your tone smart, concise, and conversational.`;

                const history = [{ role: 'user', parts: [{ text: initialPrompt }] }];
                const responseText = await generateChatResponse(history);
                setMessages([{ role: 'model', text: responseText }]);
            } catch (err) {
                setMessages([{ role: 'model', text: `I wasn't able to summarize this article. This might be due to an API error or the article content was too short.\n\n**Error:** ${err.message}` }]);
            } finally {
                setLoading(false);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        };
        fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [article.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        const newMessages = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const history = [
                { role: 'user', parts: [{ text: `Article context for our conversation:\nTitle: "${article.title}"\n\nContent:\n${articleContext.slice(0, 30000)}` }] },
                { role: 'model', parts: [{ text: messages[0]?.text || 'I have read the article.' }] },
                ...newMessages.slice(1).map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.text }]
                }))
            ];

            const responseText = await generateChatResponse(history);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, I hit an error: ${err.message}` }]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend(e);
        }
    };

    return (
        <div className="ai-sidebar slide-in-right">
            {/* Header */}
            <div className="ai-sidebar-header">
                <div className="ai-sidebar-branding">
                    <div className="ai-sidebar-icon"><GeminiIcon /></div>
                    <div>
                        <div className="ai-sidebar-label">Luna AI</div>
                        <div className="ai-sidebar-subtitle">Powered by Gemini</div>
                    </div>
                </div>
                <button className="ai-close-btn" onClick={onClose} aria-label="Close AI panel">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {/* Article context pill */}
            <div className="ai-article-pill">
                <span className="ai-article-pill-icon">📄</span>
                <span className="ai-article-pill-text">{article.title}</span>
            </div>

            {/* Messages */}
            <div className="ai-messages-pane">
                {messages.length === 0 && loading && (
                    <div className="ai-analyzing">
                        <div className="ai-analyzing-orb">
                            <div className="orb-ring r1" />
                            <div className="orb-ring r2" />
                            <div className="orb-ring r3" />
                            <GeminiIcon />
                        </div>
                        <p className="ai-analyzing-text">Analyzing article…</p>
                        <span className="ai-analyzing-sub">Luna is reading and extracting key insights</span>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`ai-message ${msg.role}`}>
                        {msg.role === 'model' && (
                            <div className="ai-message-avatar"><GeminiIcon /></div>
                        )}
                        <div className="ai-message-bubble">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}

                {loading && messages.length > 0 && (
                    <div className="ai-message model">
                        <div className="ai-message-avatar"><GeminiIcon /></div>
                        <div className="ai-message-bubble ai-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ai-input-dock">
                <form className="ai-input-form" onSubmit={handleSend}>
                    <input
                        ref={inputRef}
                        className="ai-text-input"
                        placeholder={loading ? 'Luna is thinking…' : 'Ask anything about this article…'}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="ai-submit-btn"
                        disabled={loading || !input.trim()}
                        aria-label="Send message"
                    >
                        <SendIcon />
                    </button>
                </form>
                <p className="ai-disclaimer">Luna can make mistakes. Verify important info.</p>
            </div>
        </div>
    );
}

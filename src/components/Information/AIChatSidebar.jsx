import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse } from '../../services/gemini';

export default function AIChatSidebar({ article, articleHtml, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Initial load: Request summary from Gemini
    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                // Strip HTML to get plain text so we don't waste tokens
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = articleHtml || article.snippet;
                const rawText = tempDiv.textContent || tempDiv.innerText || '';

                const initialPrompt = `You are a helpful AI assistant built into Lunasdiary. Summarize the following article in a concise, bulleted manner. Highlight the most important takeaways. Here is the article text:\n\n${rawText.slice(0, 50000)}`;

                const history = [{
                    role: 'user',
                    parts: [{ text: initialPrompt }]
                }];

                const responseText = await generateChatResponse(history);

                setMessages([
                    { role: 'model', text: responseText }
                ]);
            } catch (err) {
                console.error("Summary error:", err);
                setMessages([
                    { role: 'model', text: 'Sorry, I encoutered an error while trying to summarize this article. ' + err.message }
                ]);
            } finally {
                setLoading(false);
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
            // Map our local state format to Gemini API format
            const history = [
                {
                    role: 'user',
                    parts: [{ text: `Here is the article text for context:\n\n${articleHtml}\n\n` }]
                },
                {
                    role: 'model',
                    parts: [{ text: messages[0]?.text || 'Summary provided.' }]
                },
                ...newMessages.slice(1).map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.text }]
                }))
            ];

            const responseText = await generateChatResponse(history);
            
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-chat-sidebar slide-in-right">
            <div className="ai-chat-header">
                <div className="ai-chat-title">
                    <span className="ai-sparkle">✨</span> AI Analysis: <span>{article.title}</span>
                </div>
                <button className="card-remove" onClick={onClose} style={{ fontSize: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="ai-chat-messages">
                {messages.length === 0 && loading && (
                    <div className="ai-loading-state">
                        <div className="spinner" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', width: '2rem', height: '2rem' }} />
                        <p>Analyzing and summarizing article...</p>
                    </div>
                )}
                
                {messages.map((msg, i) => (
                    <div key={i} className={`ai-msg-bubble ${msg.role}`}>
                        {msg.role === 'model' && <div className="ai-avatar">✨</div>}
                        <div className="ai-msg-content">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                
                {loading && messages.length > 0 && (
                    <div className="ai-msg-bubble model">
                        <div className="ai-avatar">✨</div>
                        <div className="ai-msg-content typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="ai-chat-input-area" onSubmit={handleSend}>
                <input 
                    type="text" 
                    className="ai-input" 
                    placeholder="Ask a question about this article..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" className="ai-send-btn" disabled={loading || !input.trim()}>
                    ➤
                </button>
            </form>
        </div>
    );
}

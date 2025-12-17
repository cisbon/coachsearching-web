/**
 * Messaging Components Barrel Export
 * MessagingInbox, ConversationView
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

const API_BASE = 'https://clouedo.com/coachsearching/api';

/**
 * MessagingInbox Component
 * Displays list of conversations and allows selecting one
 */
export const MessagingInbox = ({ session }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const response = await fetch(`${API_BASE}/conversations`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setConversations(data.data || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return html`<div class="spinner"></div>`;
    }

    if (selectedConversation) {
        return html`
            <${ConversationView}
                conversation=${selectedConversation}
                session=${session}
                onBack=${() => setSelectedConversation(null)}
            />
        `;
    }

    return html`
        <div>
            <h3 style=${{ marginBottom: '20px' }}>Messages</h3>

            ${conversations.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">No messages yet</div>
                    <div class="empty-state-subtext">Start a conversation with a coach!</div>
                </div>
            ` : html`
                <div class="conversations-list">
                    ${conversations.map(conv => html`
                        <div
                            key=${conv.id}
                            class="conversation-item"
                            onClick=${() => setSelectedConversation(conv)}
                            style=${{
                                padding: '16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                cursor: 'pointer',
                                background: conv.unread_count > 0 ? '#F0F9FA' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong>${conv.other_participant_name}</strong>
                                <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    ${new Date(conv.last_message_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div style=${{ fontSize: '14px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ${conv.last_message_preview}
                            </div>
                            ${conv.unread_count > 0 && html`
                                <span style=${{
                                    display: 'inline-block',
                                    background: 'var(--primary-petrol)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    marginTop: '8px'
                                }}>
                                    ${conv.unread_count} new
                                </span>
                            `}
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

/**
 * ConversationView Component
 * Displays messages in a conversation with real-time updates
 */
export const ConversationView = ({ conversation, session, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [conversation.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setMessages(data.data || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content: newMessage })
            });

            if (response.ok) {
                setNewMessage('');
                await loadMessages();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div style=${{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'white'
            }}>
                <button class="btn-secondary" onClick=${onBack} style=${{ padding: '6px 12px' }}>
                    ← Back
                </button>
                <strong>${conversation.other_participant_name}</strong>
            </div>

            <div style=${{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#F5F5F5'
            }}>
                ${messages.map(msg => {
                    const isOwn = msg.sender_id === session.user.id;
                    return html`
                        <div
                            key=${msg.id}
                            style=${{
                                display: 'flex',
                                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                                marginBottom: '12px'
                            }}
                        >
                            <div style=${{
                                maxWidth: '70%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: isOwn ? 'var(--primary-petrol)' : 'white',
                                color: isOwn ? 'white' : 'var(--text-main)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                <div style=${{ fontSize: '14px', lineHeight: '1.5' }}>${msg.content}</div>
                                <div style=${{
                                    fontSize: '11px',
                                    marginTop: '4px',
                                    opacity: 0.7
                                }}>
                                    ${new Date(msg.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    `;
                })}
                <div ref=${messagesEndRef} />
            </div>

            <div style=${{
                padding: '16px',
                borderTop: '1px solid var(--border-color)',
                background: 'white'
            }}>
                <div style=${{ display: 'flex', gap: '12px' }}>
                    <textarea
                        class="form-control"
                        rows="2"
                        placeholder="Type your message..."
                        value=${newMessage}
                        onInput=${(e) => setNewMessage(e.target.value)}
                        onKeyPress=${handleKeyPress}
                        disabled=${sending}
                        style=${{ flex: 1, resize: 'none' }}
                    ></textarea>
                    <button
                        class="btn-primary"
                        onClick=${handleSend}
                        disabled=${sending || !newMessage.trim()}
                        style=${{ alignSelf: 'flex-end' }}
                    >
                        ${sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
                <div class="form-hint" style=${{ marginTop: '4px' }}>Press Enter to send, Shift+Enter for new line</div>
            </div>
        </div>
    `;
};

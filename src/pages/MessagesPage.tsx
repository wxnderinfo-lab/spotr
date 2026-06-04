import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConversations, useMessages, usePresence } from '../hooks/useMessages';
import Header from '../components/Header';
import Avatar from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/Shared';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  Send, Paperclip, Search, MoreHorizontal, MessageSquare,
  CheckCheck, Loader, ArrowLeft, Phone, Video
} from 'lucide-react';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-NL', { weekday: 'short' });
  return d.toLocaleDateString('en-NL', { day: 'numeric', month: 'short' });
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { conversations, loading: loadingConvs } = useConversations(user?.id);
  const { isOnline } = usePresence(user?.id);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useDocumentTitle('Messages');

  const { messages, loading: loadingMsgs, sending, send, typingUsers, sendTyping } = useMessages(activeConvId || undefined, user?.id);
  const activeConv = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageText]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText;
    setMessageText('');
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    sendTyping();
  };

  const filteredConvs = conversations.filter(c =>
    c.other?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: typeof messages }[]>((acc, msg) => {
    const day = new Date(msg.created_at).toDateString();
    const last = acc[acc.length - 1];
    if (!last || last.date !== day) {
      acc.push({ date: day, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col">
      <Header />
      <div className="flex-1 flex pt-16 overflow-hidden h-[calc(100dvh-120px)] md:h-[calc(100dvh-64px)]">
        <div className="flex flex-1 w-full max-w-7xl mx-auto overflow-hidden border-x border-neutral-100 dark:border-neutral-800">

          {/* Sidebar */}
          <div className={`${activeConvId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-neutral-100 dark:border-neutral-800 flex-shrink-0`}>
            <div className="px-4 py-5 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Messages</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="input-base pl-9 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader size={20} className="animate-spin text-neutral-300 dark:text-neutral-700" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations yet"
                  description="Start a conversation by visiting a freelancer's profile."
                />
              ) : (
                filteredConvs.map(conv => {
                  const isActive = conv.id === activeConvId;
                  const unread = conv.participant_1 === user?.id ? conv.unread_count_1 : conv.unread_count_2;
                  const online = isOnline(conv.other?.id);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-neutral-50 dark:border-neutral-800/50 last:border-0 ${
                        isActive ? 'bg-neutral-50 dark:bg-neutral-900/60' : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-900/30'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={conv.other?.full_name || '?'} src={conv.other?.avatar_url} size="md" online={online} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-neutral-900 dark:text-white' : 'font-medium text-neutral-700 dark:text-neutral-300'}`}>
                            {conv.other?.full_name || 'Unknown'}
                          </p>
                          <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${unread > 0 ? 'text-neutral-600 dark:text-neutral-300 font-medium' : 'text-neutral-400 dark:text-neutral-500'}`}>
                            {conv.last_message || 'Start a conversation'}
                          </p>
                          {unread > 0 && (
                            <span className="ml-2 min-w-[18px] h-[18px] px-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          {activeConvId && activeConv ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors -ml-1 mr-1 text-neutral-500"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar
                    name={activeConv.other?.full_name || '?'}
                    src={activeConv.other?.avatar_url}
                    size="sm"
                    online={isOnline(activeConv.other?.id)}
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-none">{activeConv.other?.full_name}</p>
                    <p className={`text-xs mt-0.5 ${isOnline(activeConv.other?.id) ? 'text-green-500' : 'text-neutral-400'}`}>
                      {isOnline(activeConv.other?.id) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors hidden sm:flex">
                    <Phone size={16} />
                  </button>
                  <button className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors hidden sm:flex">
                    <Video size={16} />
                  </button>
                  <button className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 bg-neutral-50/40 dark:bg-neutral-950">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={20} className="animate-spin text-neutral-300 dark:text-neutral-700" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <div className="text-center py-10">
                      <Avatar name={activeConv.other?.full_name || '?'} src={activeConv.other?.avatar_url} size="xl" className="mx-auto mb-3" online={isOnline(activeConv.other?.id)} />
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{activeConv.other?.full_name}</p>
                      <p className="text-xs text-neutral-400 mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {groupedMessages.map(group => (
                      <div key={group.date}>
                        {/* Date separator */}
                        <div className="flex items-center gap-3 my-5">
                          <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                          <span className="text-xs text-neutral-400 font-medium flex-shrink-0 px-2">
                            {formatDateSeparator(group.msgs[0].created_at)}
                          </span>
                          <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                        </div>

                        <div className="space-y-0.5">
                          {group.msgs.map((msg, i) => {
                            const isMe = msg.sender_id === user?.id;
                            const allMsgs = group.msgs;
                            const prevMsg = i > 0 ? allMsgs[i - 1] : null;
                            const nextMsg = i < allMsgs.length - 1 ? allMsgs[i + 1] : null;
                            const showAvatar = !isMe && (!nextMsg || nextMsg.sender_id !== msg.sender_id);
                            const isLast = isMe && (!nextMsg || nextMsg.sender_id !== msg.sender_id);
                            const isClustered = !!prevMsg && prevMsg.sender_id === msg.sender_id;

                            return (
                              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${isClustered ? '' : 'mt-3'}`}>
                                {!isMe && (
                                  <div className="w-6 flex-shrink-0 self-end mb-0.5">
                                    {showAvatar && (
                                      <Avatar name={msg.sender?.full_name || '?'} src={msg.sender?.avatar_url} size="xs" />
                                    )}
                                  </div>
                                )}
                                <div className={`group max-w-[72%] sm:max-w-[58%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                  <div className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                                    isMe
                                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[20px] rounded-br-md'
                                      : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-700 rounded-[20px] rounded-bl-md'
                                  }`}>
                                    {msg.content}
                                  </div>
                                  {(isLast || (!isMe && showAvatar)) && (
                                    <div className="flex items-center gap-1 mt-1 px-1">
                                      <span className="text-xs text-neutral-400">{formatFullTime(msg.created_at)}</span>
                                      {isMe && <CheckCheck size={11} className={msg.is_read ? 'text-blue-500' : 'text-neutral-400'} />}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                      <div className="flex items-end gap-2 mt-3">
                        <div className="w-6 flex-shrink-0">
                          <Avatar name={activeConv.other?.full_name || '?'} src={activeConv.other?.avatar_url} size="xs" />
                        </div>
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-[20px] rounded-bl-md px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-4 sm:px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex-shrink-0">
                <div className="flex items-end gap-2.5">
                  <button className="p-2.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0 self-end">
                    <Paperclip size={18} />
                  </button>
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message…"
                      className="input-base resize-none py-3 block w-full"
                      style={{ minHeight: '46px', maxHeight: '120px' }}
                      rows={1}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                    className="p-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end"
                  >
                    {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <p className="hidden sm:block text-xs text-neutral-400 mt-1.5 pl-1">Shift + Enter for new line</p>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-neutral-50/40 dark:bg-neutral-950">
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-5">
                  <MessageSquare size={26} className="text-neutral-400 dark:text-neutral-600" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">Select a conversation</h3>
                <p className="text-sm text-neutral-400 max-w-xs">Choose from your conversations or message someone from their profile.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

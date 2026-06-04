import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchConversations, fetchMessages, sendMessage as sendMsg,
  getOrCreateConversation, markMessagesRead
} from '../lib/queries';
import type { Conversation, Message, Profile } from '../lib/supabase';

interface ConversationWithParticipant extends Conversation {
  other: Profile;
}

interface MessageWithSender extends Message {
  sender: Profile;
}

// ─── Online Presence ─────────────────────────────────────────────────────────

export function usePresence(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set(Object.keys(state));
        setOnlineUsers(ids);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { onlineUsers, isOnline: (id: string) => onlineUsers.has(id) };
}

// ─── Conversations ────────────────────────────────────────────────────────────

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<ConversationWithParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await fetchConversations(userId);
    const enriched = (data || []).map((c: any) => ({
      ...c,
      other: c.participant_1 === userId ? c.p2 : c.p1,
    }));
    setConversations(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversations-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant_1=eq.${userId}`,
      }, load)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant_2=eq.${userId}`,
      }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  return { conversations, loading, refetch: load };
}

// ─── Messages + Typing ───────────────────────────────────────────────────────

export function useMessages(conversationId: string | undefined, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) { setLoading(false); return; }
    const { data } = await fetchMessages(conversationId);
    setMessages((data as unknown as MessageWithSender[]) || []);
    setLoading(false);
    if (currentUserId) await markMessagesRead(conversationId, currentUserId);
  }, [conversationId, currentUserId]);

  useEffect(() => { load(); }, [load]);

  // Real-time message subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .maybeSingle();
          const newMsg = { ...payload.new, sender } as MessageWithSender;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if we're viewing this conversation
          if (currentUserId && payload.new.sender_id !== currentUserId) {
            await markMessagesRead(conversationId, currentUserId);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  // Typing indicator channel using Realtime Broadcast
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId: typingUserId } = payload as { userId: string };
        if (typingUserId === currentUserId) return;

        setTypingUsers(prev => prev.includes(typingUserId) ? prev : [...prev, typingUserId]);

        // Clear after 3 seconds of no new typing events
        clearTimeout(typingTimeouts.current[typingUserId]);
        typingTimeouts.current[typingUserId] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== typingUserId));
        }, 3000);
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      Object.values(typingTimeouts.current).forEach(clearTimeout);
    };
  }, [conversationId, currentUserId]);

  const sendTyping = useCallback(() => {
    if (!typingChannelRef.current || !currentUserId) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId },
    });
  }, [currentUserId]);

  const send = async (content: string) => {
    if (!conversationId || !currentUserId || !content.trim()) return;
    setSending(true);
    await sendMsg({ conversation_id: conversationId, sender_id: currentUserId, content: content.trim() });
    setSending(false);
  };

  return { messages, loading, sending, send, typingUsers, sendTyping };
}

// ─── Start / Open Conversation ───────────────────────────────────────────────

export function useStartConversation() {
  const [loading, setLoading] = useState(false);

  const start = async (userId: string, otherId: string): Promise<string | null> => {
    setLoading(true);
    const { data, error } = await getOrCreateConversation(userId, otherId);
    setLoading(false);
    return error ? null : data.id;
  };

  return { start, loading };
}

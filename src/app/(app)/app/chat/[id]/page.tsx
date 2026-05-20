'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/app/ClientLayout';
import {
  FiArrowLeft, FiSearch, FiTrash2, FiStar, FiMic, FiPaperclip, FiSmile, FiPhone, FiVideo, FiPhoneOff, FiVideoOff, FiPhoneMissed, FiPhoneForwarded
} from 'react-icons/fi';
import { BsCheckCircleFill, BsCheck2, BsCheck2All, BsPlayFill, BsStopFill } from 'react-icons/bs';
import { IoSend } from 'react-icons/io5';
import { playNotificationSound } from '@/lib/sound';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  voice_url: string | null;
  media_url: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  is_read: boolean;
  reply_to_message_id: string | null;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, soundEnabled, isOnline } = useApp();
  const router = useRouter();
  const [chatId, setChatId] = useState<string>('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [callMissed, setCallMissed] = useState(false);

  const stickers = ['👍', '❤️', '😂', '😢', '😡', '🔥', '💯', '🎉', '👏', '🤝', '😊', '🥰', '😎', '🤔', '🙏', '💪'];

  useEffect(() => {
    params.then((p) => setChatId(p.id));
  }, [params]);

  useEffect(() => {
    if (!chatId || !user) return;
    loadChat();
    loadMessages();

    const messagesSub = supabase
      .channel(`messages:${chatId}`)
      .on(
         'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== user.id && soundEnabled) {
              playSound();
            }
            markAsRead();
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const typingSub = supabase
      .channel(`typing:${chatId}`)
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { username, userId: typingUserId } = payload.payload;
        if (typingUserId !== user.id) {
          setTypingUsers((prev) => new Set(prev).add(username));
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(username);
              return next;
            });
          }, 3000);
        }
      })
      .subscribe();

    // Call signaling channel
    const callChan = supabase.channel(`call:${chatId}`, {
      config: { broadcast: { self: false } },
    });

    callChan
      .on('broadcast', { event: 'call-offer' }, (payload: any) => {
        const { from, fromUsername, type: callTypePayload } = payload.payload;
        if (from !== user.id && callState === 'idle') {
          setCallType(callTypePayload || 'audio');
          setCallState('incoming');
          callChannelRef.current = callChan;
          if (soundEnabled) playSound();
        }
      })
      .on('broadcast', { event: 'call-accept' }, async (payload: any) => {
        if (callState === 'calling') {
          setCallState('connected');
          startCallTimer();
        }
      })
      .on('broadcast', { event: 'call-end' }, (payload: any) => {
        if (callState === 'calling' || callState === 'connected' || callState === 'incoming') {
          setCallMissed(callState === 'calling' || callState === 'incoming');
          cleanupCall();
          if (payload.payload?.reason !== 'ended') {
            toast.error('Звонок отклонен');
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, (payload: any) => {
        const { candidate } = payload.payload;
        if (candidate && peerConnectionRef.current) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSub);
      supabase.removeChannel(typingSub);
      supabase.removeChannel(callChan);
      cleanupCall();
    };
  }, [chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
     const target = e.currentTarget;
     if (target.scrollTop === 0 && !loadingMore && hasMore) {
       setLoadingMore(true);
       loadMessages(false);
     }
   };

  const playSound = () => {
    playNotificationSound();
  };

  const getCallChannel = () => {
    if (!chatId || !user) return null;
    const channel = supabase.channel(`call:${chatId}`, {
      config: { broadcast: { self: false } },
    });
    return channel;
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!chatId || !user || !otherUser) return;
    setCallType(type);
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && callChannelRef.current) {
          callChannelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: e.candidate, from: user.id },
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const channel = getCallChannel();
      if (channel) {
        callChannelRef.current = channel;
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'call-offer',
              payload: { offer, from: user.id, fromUsername: user.username, type, chatId },
            });
          }
        });
      }
    } catch (err) {
      toast.error('Ошибка доступа к камере/микрофону');
      setCallState('idle');
    }
  };

  const answerCall = async (accept: boolean) => {
    if (!chatId || !user || !otherUser) return;
    if (!accept) {
      setCallState('idle');
      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'call-end',
          payload: { from: user.id, reason: 'declined' },
        });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && callChannelRef.current) {
          callChannelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: e.candidate, from: user.id },
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'call-accept',
          payload: { from: user.id, fromUsername: user.username },
        });
      }

      setCallState('connected');
      startCallTimer();
    } catch (err) {
      toast.error('Ошибка доступа к камере/микрофону');
      setCallState('idle');
    }
  };

  const endCall = () => {
    if (callChannelRef.current) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'call-end',
        payload: { from: user?.id, reason: 'ended' },
      });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((t) => t.stop());
      setRemoteStream(null);
    }
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
    setCallState('idle');
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const loadChat = async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      const data = await res.json();
      if (data.otherUser) setOtherUser(data.otherUser);
      if (data.chat?.pinned_by) {
        setIsPinned(data.chat.pinned_by.includes(user?.id));
      }
    } catch {}
  };

   const loadMessages = async (reset = false) => {
     try {
       if (reset) {
         setLoadingMore(false);
         setHasMore(true);
         setMessages([]);
       }
       const res = await fetch(`/api/messages/${chatId}?limit=50&offset=${reset ? 0 : messages.length}`);
       const data = await res.json();
       if (data.messages) {
         // Сортируем по времени создания (старые сначала) для правильного отображения
         const sortedMessages = [...data.messages].sort((a, b) => 
           new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
         );
         if (reset) {
           setMessages(sortedMessages);
         } else {
           setMessages(prev => [...prev, ...sortedMessages]);
         }
         setHasMore(data.messages.length === 50); // Предполагаем, что если получили 50, то есть еще
         // Прокручиваем к низу после загрузки (только при первой загрузке)
         if (reset) {
           setTimeout(scrollToBottom, 100);
         }
       } else {
         setHasMore(false);
       }
     } catch (error) {
       console.error('Error loading messages:', error);
       setHasMore(false);
     } finally {
       if (!reset) {
         setLoadingMore(false);
       }
     }
   };

  const markAsRead = async () => {
    if (!chatId) return;
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      });
    } catch {}
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const dur = recordingDuration;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 400000) {
          toast.error('Голосовое слишком большое');
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('voice')
          .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: false });

        if (uploadError || !uploadData) {
          toast.error(uploadError?.message || 'Ошибка загрузки голоса');
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const { data: urlData } = supabase
          .storage
          .from('voice')
          .getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        if (chatId) {
          try {
            const mins = Math.floor(dur / 60);
            const secs = dur % 60;
            const label = `🎤 ${mins}:${secs.toString().padStart(2, '0')}`;
            const res = await fetch(`/api/messages/${chatId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: label, voice_url: publicUrl }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              toast.error(err.error || 'Ошибка отправки голоса');
            }
          } catch {
            toast.error('Ошибка отправки голоса');
          }
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 30) { stopRecording(); return 30; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error('Разрешите доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const toggleVoicePlay = (msg: Message) => {
    if (playingVoiceId === msg.id) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); }
      const audio = new Audio(msg.voice_url!);
      audioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      audio.play().catch(() => toast.error('Ошибка воспроизведения'));
      setPlayingVoiceId(msg.id);
    }
  };

   const sendMessage = async () => {
     const text = newMessage.trim();
     if (!text) return;

     if (editingMsg) {
       try {
         const res = await fetch(`/api/messages/${chatId}`, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ message_id: editingMsg, text, action: 'edit' }),
         });
         if (res.ok) {
           setEditingMsg(null);
           setEditText('');
           setNewMessage('');
         }
       } catch {}
       return;
     }

     // Optimistic update - add message immediately
     const optimisticMessage: Message = {
       id: `optimistic-${Date.now()}-${Math.random()}`,
       chat_id: chatId,
       sender_id: user?.id || '',
       text,
       voice_url: null,
       media_url: null,
       created_at: new Date().toISOString(),
       edited_at: null,
       is_deleted: false,
       is_read: false,
       reply_to_message_id: replyTo?.id || null,
     };

     setMessages(prev => [...prev, optimisticMessage]);
     setNewMessage('');
     setReplyTo(null);
     scrollToBottom();

     try {
       const body: any = { text };
       if (replyTo) body.reply_to_message_id = replyTo.id;

       const res = await fetch(`/api/messages/${chatId}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(body),
       });
       if (!res.ok) {
         // Remove optimistic message on error
         setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
         toast.error('Ошибка отправки');
       }
     } catch (error) {
       // Remove optimistic message on error
       setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
       toast.error('Ошибка отправки');
     }
   };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    handleTyping();
  };

  const handleTyping = useCallback(() => {
    if (!chatId || !user) return;
    supabase.channel(`typing:${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { username: user.username, userId: user.id },
    });
  }, [chatId, user]);

  const deleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, action: 'delete' }),
      });
    } catch {}
  };

  const startEdit = (msg: Message) => {
    setEditingMsg(msg.id);
    setEditText(msg.text);
    setNewMessage(msg.text);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setEditText('');
    setNewMessage('');
  };

  const togglePin = async () => {
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pin' }),
      });
      setIsPinned(!isPinned);
      toast.success(isPinned ? 'Чат откреплен' : 'Чат закреплен');
    } catch {}
  };

  const deleteChat = async () => {
    if (!confirm('Удалить чат? Это действие нельзя отменить.')) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/app');
        toast.success('Чат удален');
      }
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;
    setUploadingMedia(true);
    try {
      const isImage = file.type.startsWith('image/');
      const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      const fileName = `chat_${chatId}_${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('media')
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (uploadError || !uploadData) {
        toast.error(uploadError?.message || 'Ошибка загрузки');
        return;
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
      const mediaUrl = urlData.publicUrl;

      const res = await fetch(`/api/messages/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          media_url: mediaUrl,
          reply_to_message_id: replyTo?.id || null,
        }),
      });
      if (res.ok) {
        setReplyTo(null);
        scrollToBottom();
      } else {
        toast.error('Ошибка отправки');
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const sendSticker = async (emoji: string) => {
    if (!chatId) return;
    try {
      await fetch(`/api/messages/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emoji, reply_to_message_id: replyTo?.id || null }),
      });
      setReplyTo(null);
      setShowStickers(false);
      scrollToBottom();
    } catch {
      toast.error('Ошибка отправки');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getReplyMessage = (replyId: string) => {
    return messages.find((m) => m.id === replyId);
  };

  const isUserOnline = () => {
    if (!otherUser?.last_seen) return false;
    return Date.now() - new Date(otherUser.last_seen).getTime() < 120000;
  };

  const filteredMessages = searchInChat
    ? messages.filter((m) => !m.is_deleted && m.text.toLowerCase().includes(searchInChat.toLowerCase()))
    : messages;

  if (!otherUser) {
    return (
      <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: 300, height: 200 }} />
    </div>
  );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button
          onClick={() => router.push('/app')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.3rem' }}
          className="mobile-back"
        >
          <FiArrowLeft />
        </button>
        <div className="chat-avatar" style={{ width: 40, height: 40, fontSize: '0.85rem', cursor: 'pointer' }}
          onClick={() => router.push(`/app/profile/${otherUser.username}`)}>
          {otherUser.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : otherUser.username?.charAt(0).toUpperCase()}
          {isUserOnline() && <div className="online-dot" />}
        </div>
        <div className="chat-header-info" style={{ cursor: 'pointer' }}
          onClick={() => router.push(`/app/profile/${otherUser.username}`)}>
          <div className="chat-header-name">
            @{otherUser.username}
            {otherUser.is_verified && <BsCheckCircleFill className="verified-badge" />}
          </div>
          <div className="chat-header-status">
            {typingUsers.size > 0
              ? 'печатает...'
              : isUserOnline()
                ? 'в сети'
                : `был(а) ${new Date(otherUser.last_seen).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => startCall('audio')}
            className="message-action-btn"
            title="Аудиозвонок"
            disabled={callState !== 'idle'}
            style={{ opacity: callState !== 'idle' ? 0.5 : 1, color: 'var(--primary)' }}
          >
            <FiPhone />
          </button>
          <button
            onClick={() => startCall('video')}
            className="message-action-btn"
            title="Видеозвонок"
            disabled={callState !== 'idle'}
            style={{ opacity: callState !== 'idle' ? 0.5 : 1, color: 'var(--primary)' }}
          >
            <FiVideo />
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="message-action-btn" title="Поиск">
            <FiSearch />
          </button>
          <button onClick={togglePin} className="message-action-btn" title={isPinned ? 'Открепить' : 'Закрепить'}>
            <FiStar style={{ color: isPinned ? 'var(--primary)' : undefined }} />
          </button>
          <button onClick={deleteChat} className="message-action-btn" title="Удалить чат">
            <FiTrash2 />
          </button>
        </div>
      </div>

      {showSearch && (
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <input
            className="sky-input"
            placeholder="Поиск в переписке..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
          />
        </div>
      )}

      <div className="messages-container" ref={messagesContainerRef}>
        {filteredMessages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          if (msg.is_deleted) {
            return (
              <div key={msg.id} className={`message-row ${isOwn ? 'own' : 'other'}`}>
                <div className="message-bubble" style={{ fontStyle: 'italic', opacity: 0.5, fontSize: '0.85rem' }}>
                  Сообщение удалено
                </div>
              </div>
            );
          }
          const replyMsg = msg.reply_to_message_id ? getReplyMessage(msg.reply_to_message_id) : null;
          return (
            <div key={msg.id} className={`message-row ${isOwn ? 'own' : 'other'}`}>
              <div className="message-bubble" style={{ position: 'relative' }}>
                <div className="message-actions">
                  {isOwn && (
                    <>
                      <button className="message-action-btn" onClick={() => startEdit(msg)} title="Редактировать">
                        ✏️
                      </button>
                      <button className="message-action-btn" onClick={() => deleteMessage(msg.id)} title="Удалить">
                        🗑️
                      </button>
                    </>
                  )}
                  <button className="message-action-btn" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} title="Ответить">
                    ↩️
                  </button>
                </div>
                {replyMsg && (
                  <div className="reply-preview">
                    {replyMsg.is_deleted ? 'Сообщение удалено' : (replyMsg.voice_url ? '🎤 Голосовое сообщение' : replyMsg.text)}
                  </div>
                )}
                {msg.media_url && (
                  <div style={{ marginBottom: msg.text && !msg.voice_url ? '0.4rem' : 0 }}>
                    {msg.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={msg.media_url} controls style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                    ) : (
                      <img src={msg.media_url} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, display: 'block' }} loading="lazy" />
                    )}
                  </div>
                )}
                {msg.voice_url ? (
                  <VoiceMessagePlayer
                    voiceUrl={msg.voice_url}
                    duration={msg.text}
                    isOwn={isOwn}
                    isPlaying={playingVoiceId === msg.id}
                    onPlay={() => toggleVoicePlay(msg)}
                  />
                ) : msg.text && (
                  <span>{msg.text}</span>
                )}
                <div className="message-time">
                  {formatTime(msg.created_at)}
                  {msg.edited_at && <span style={{ fontSize: '0.65rem' }}> (ред.)</span>}
                  {isOwn && (
                    msg.is_read
                      ? <BsCheck2All className="message-check read" />
                      : <BsCheck2 className="message-check" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span>{Array.from(typingUsers).join(', ')} печатает</span>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        {replyTo && (
          <div className="reply-bar">
            <span className="reply-text">Ответ на: {replyTo.text.substring(0, 50)}</span>
            <span className="cancel-reply" onClick={() => setReplyTo(null)}>✕</span>
          </div>
        )}
        {editingMsg && (
          <div className="reply-bar" style={{ color: 'var(--primary)' }}>
            <span className="reply-text">Редактирование сообщения</span>
            <span className="cancel-reply" onClick={cancelEdit}>✕</span>
          </div>
        )}
        {showStickers && (
          <div style={{
            padding: '0.5rem', borderTop: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
            justifyContent: 'center', maxHeight: 160, overflowY: 'auto',
          }}>
            {stickers.map((s) => (
              <button
                key={s}
                onClick={() => sendSticker(s)}
                style={{
                  width: 44, height: 44, borderRadius: '10px', border: 'none',
                  background: 'var(--background)', cursor: 'pointer', fontSize: '1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--background)'}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="message-input-wrapper">
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, padding: '0.2rem 0.5rem' }}>
              <span style={{ color: '#ef4444', fontWeight: 600, animation: 'splashPulse 1s infinite' }}>
                🔴 {recordingDuration}s
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Говорите...</span>
              <button onClick={stopRecording} style={{
                marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: '#ef4444', color: 'white', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
              }}>
                <BsStopFill />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file" accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                title="Прикрепить фото/видео"
              >
                <FiPaperclip />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder="Написать сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={4096}
              />
              {newMessage.trim() ? (
                <button className="send-btn" onClick={sendMessage} disabled={!isOnline}>
                  <IoSend />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowStickers(!showStickers)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none',
                      background: showStickers ? 'var(--primary-light)' : 'transparent',
                      color: showStickers ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0, transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => { if (!showStickers) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    title="Стикеры"
                  >
                    <FiSmile />
                  </button>
                  <button
                    onClick={startRecording}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none',
                      background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                      flexShrink: 0, transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title="Голосовое сообщение"
                  >
                    <FiMic />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Call Overlay */}
      {callState !== 'idle' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', zIndex: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', color: 'white', gap: '1.5rem',
        }}>
          {callState === 'calling' && (
            <>
              <div className="chat-avatar" style={{ width: 80, height: 80, fontSize: '2rem', border: '3px solid var(--primary)' }}>
                {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : otherUser?.username?.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>@{otherUser?.username}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, animation: 'splashPulse 1.5s infinite' }}>
                {callType === 'video' ? '🎥 Видеозвонок...' : '📞 Аудиозвонок...'}
              </div>
              <button
                onClick={endCall}
                style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none',
                  background: '#ef4444', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem',
                }}
              >
                <FiPhoneOff />
              </button>
            </>
          )}
          {callState === 'incoming' && (
            <>
              <div className="chat-avatar" style={{ width: 80, height: 80, fontSize: '2rem', border: '3px solid #22c55e' }}>
                {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : otherUser?.username?.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>@{otherUser?.username}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                {callType === 'video' ? '📹 Входящий видеозвонок...' : '📞 Входящий аудиозвонок...'}
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <button
                  onClick={() => answerCall(false)}
                  style={{
                    width: 56, height: 56, borderRadius: '50%', border: 'none',
                    background: '#ef4444', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem',
                  }}
                >
                  <FiPhoneOff />
                </button>
                <button
                  onClick={() => answerCall(true)}
                  style={{
                    width: 56, height: 56, borderRadius: '50%', border: 'none',
                    background: '#22c55e', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem',
                  }}
                >
                  <FiPhone />
                </button>
              </div>
            </>
          )}
          {callState === 'connected' && (
            <>
              {callType === 'video' ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {remoteStream ? (
                    <video
                      ref={(el) => { if (el) el.srcObject = remoteStream; }}
                      autoPlay playsInline
                      style={{ flex: 1, width: '100%', objectFit: 'cover', borderRadius: 12 }}
                    />
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="chat-avatar" style={{ width: 80, height: 80, fontSize: '2rem', border: '3px solid var(--primary)' }}>
                        {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : otherUser?.username?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  {localStream && (
                    <video
                      ref={(el) => { if (el) el.srcObject = localStream; }}
                      autoPlay playsInline muted
                      style={{
                        position: 'absolute', bottom: 100, right: 20,
                        width: 120, height: 160, borderRadius: 12,
                        objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)',
                        background: '#111',
                      }}
                    />
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '1rem', display: 'flex', justifyContent: 'center',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{formatCallDuration(callDuration)}</div>
                    </div>
                    <button
                      onClick={endCall}
                      style={{
                        width: 56, height: 56, borderRadius: '50%', border: 'none',
                        background: '#ef4444', color: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem',
                      }}
                    >
                      <FiPhoneOff />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div className="chat-avatar" style={{ width: 100, height: 100, fontSize: '2.5rem', border: '3px solid #22c55e' }}>
                    {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : otherUser?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '1rem' }}>@{otherUser?.username}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCallDuration(callDuration)}
                  </div>
                  <button
                    onClick={endCall}
                    style={{
                      marginTop: '1rem', width: 56, height: 56, borderRadius: '50%', border: 'none',
                      background: '#ef4444', color: 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem',
                    }}
                  >
                    <FiPhoneOff />
                  </button>
                </div>
              )}
            </>
          )}
          {callState === 'ended' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Звонок завершен</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{formatCallDuration(callDuration)}</div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function VoiceMessagePlayer({ voiceUrl, duration, isOwn, isPlaying, onPlay }: {
  voiceUrl: string; duration: string; isOwn: boolean; isPlaying: boolean; onPlay: () => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);

  const totalSeconds = (() => {
    const match = duration.match(/🎤 (\d+):(\d+)/);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
    return 0;
  })();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

   useEffect(() => {
     if (!isPlaying) {
       setCurrentTime(0);
       setProgress(0);
       return;
     }
     const audio = new Audio(voiceUrl);
     audioRef.current = audio;
     
     const playAudio = () => {
       audio.play().catch((error) => {
         console.error('Voice message playback error:', error);
         toast.error('Ошибка воспроизведения голоса: ' + error.message);
         setPlayingVoiceId(null);
         if (audioRef.current) { 
           audioRef.current.pause(); 
           audioRef.current = null; 
         }
       });
     };

     // Try to play, but handle autoplay restrictions
     playAudio();

     const update = () => {
       if (audio.duration && !isNaN(audio.duration)) {
         setCurrentTime(audio.currentTime);
         setProgress((audio.currentTime / audio.duration) * 100);
       }
       animRef.current = requestAnimationFrame(update);
     };
     animRef.current = requestAnimationFrame(update);

     audio.onended = () => {
       cancelAnimationFrame(animRef.current);
       setCurrentTime(totalSeconds);
       setProgress(100);
       setPlayingVoiceId(null);
     };

     return () => {
       cancelAnimationFrame(animRef.current);
       if (audioRef.current) { 
         audioRef.current.pause(); 
         audioRef.current = null; 
       }
     };
   }, [isPlaying, voiceUrl]);

  const dispTime = formatTime(currentTime);
  const dispTotal = duration.replace('🎤 ', '');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      minWidth: 180, maxWidth: 260, padding: '0.1rem 0',
    }}>
      <button
        onClick={onPlay}
        style={{
          width: 30, height: 30, borderRadius: '50%', border: 'none',
          background: 'var(--primary)', color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', flexShrink: 0,
        }}
      >
        {isPlaying ? <BsStopFill /> : <BsPlayFill />}
      </button>
      <span style={{
        fontSize: '0.72rem', color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', minWidth: 30,
        fontFamily: 'monospace',
      }}>
        {dispTime}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          height: 4, borderRadius: 2,
          background: isOwn ? 'rgba(0,0,0,0.08)' : 'var(--border)',
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
        }}>
          <div style={{
            width: `${Math.min(progress, 100)}%`, height: '100%',
            borderRadius: 2, background: 'var(--primary)',
            transition: 'width 0.1s linear',
          }} />
        </div>
      </div>
      <span style={{
        fontSize: '0.72rem', color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', minWidth: 30,
        fontFamily: 'monospace', textAlign: 'right',
      }}>
        {dispTotal}
      </span>
    </div>
  );
}
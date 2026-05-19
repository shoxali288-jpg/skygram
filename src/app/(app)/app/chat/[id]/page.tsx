'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/app/ClientLayout';
import { FiArrowLeft, FiSearch, FiTrash2, FiStar, FiMic } from 'react-icons/fi';
import { BsCheckCircleFill, BsCheck2, BsCheck2All, BsPlayFill, BsStopFill } from 'react-icons/bs';
import { IoSend } from 'react-icons/io5';
import { playNotificationSound } from '@/lib/sound';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  voice_url: string | null;
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

    return () => {
      supabase.removeChannel(messagesSub);
      supabase.removeChannel(typingSub);
    };
  }, [chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playSound = () => {
    playNotificationSound();
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

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${chatId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {}
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
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64audio = reader.result as string;
          if (base64audio && chatId) {
            try {
              const mins = Math.floor(dur / 60);
              const secs = dur % 60;
              const label = `🎤 ${mins}:${secs.toString().padStart(2, '0')}`;
              const res = await fetch(`/api/messages/${chatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: label, voice_url: base64audio }),
              });
              if (!res.ok) toast.error('Ошибка отправки');
            } catch { toast.error('Ошибка отправки'); }
          }
        };
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

    try {
      const body: any = { text };
      if (replyTo) body.reply_to_message_id = replyTo.id;

      const res = await fetch(`/api/messages/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewMessage('');
        setReplyTo(null);
        scrollToBottom();
      }
    } catch {
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
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.3rem', display: 'none' }}
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
                {msg.voice_url ? (
                  <VoiceMessagePlayer
                    voiceUrl={msg.voice_url}
                    duration={msg.text}
                    isOwn={isOwn}
                    isPlaying={playingVoiceId === msg.id}
                    onPlay={() => toggleVoicePlay(msg)}
                  />
                ) : (
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
                <button
                  onClick={startRecording}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  title="Голосовое сообщение"
                >
                  <FiMic />
                </button>
              )}
            </>
          )}
        </div>
      </div>

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
    audio.play().catch(() => {});

    const update = () => {
      if (audio.duration) {
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
    };

    return () => {
      cancelAnimationFrame(animRef.current);
      audio.pause();
      audioRef.current = null;
    };
  }, [isPlaying, voiceUrl]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 180, maxWidth: 260 }}>
      <button
        onClick={onPlay}
        style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: isOwn ? 'var(--primary)' : 'var(--primary)',
          color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', flexShrink: 0,
        }}
      >
        {isPlaying ? <BsStopFill /> : <BsPlayFill />}
      </button>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ height: 4, borderRadius: 2, background: isOwn ? 'rgba(0,0,0,0.1)' : 'var(--border)', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(progress, 100)}%`, height: '100%',
            borderRadius: 2, background: 'var(--primary)',
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
          {isPlaying ? formatTime(currentTime) : duration.replace('🎤 ', '')}
        </div>
      </div>
    </div>
  );
}
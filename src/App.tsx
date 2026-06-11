import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import logoUrl from '../logo.jpg';

type ChatMessage = {
  id: string;
  content: string;
  isUser: boolean;
  isError?: boolean;
  time: string;
};

type UserProfile = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
};

const emptyUserProfile: UserProfile = {
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
};

function getSavedUserProfile(): UserProfile {
  const savedProfile = localStorage.getItem('chatbot-hr-user-profile');
  if (!savedProfile) return emptyUserProfile;

  try {
    return { ...emptyUserProfile, ...(JSON.parse(savedProfile) as Partial<UserProfile>) };
  } catch {
    return emptyUserProfile;
  }
}

type ThemeMode = 'system' | 'light' | 'dark' | 'oled';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'oled', label: 'OLED' },
];

const WEBHOOK_BASE_URL = import.meta.env.VITE_WEBHOOK_URL ?? 'https://n8n.fakduai.com/webhook/chat-hr';
const LEAVE_CALENDAR_URL = 'https://calendar.google.com/calendar/u/2?cid=YTc4NGUxNTRmYmRlYzhmZDMzODFiYWJlZjMyYmQ0NTJlYTllZGJiMThhZTk5ZTk4ZThlYjQ3ZmMxMGM3NDdiYUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t';

function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function formatTime() {
  return new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/;
const URL_SPLIT_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;

function normalizeMessage(content: string) {
  return content.replace(/\\n/g, '\n').replace(/\/n/g, '\n');
}

function toHref(url: string) {
  return url.startsWith('www.') ? `https://${url}` : url;
}

function MessageLine({ line }: { line: string }) {
  const parts = line.split(URL_SPLIT_PATTERN);

  return parts.map((part, index) => {
    if (!URL_PATTERN.test(part)) return <span key={`${part}-${index}`}>{part}</span>;

    const trailingPunctuation = part.match(/[.,!?)]$/)?.[0] ?? '';
    const url = trailingPunctuation ? part.slice(0, -1) : part;

    return (
      <span key={`${part}-${index}`}>
        <a href={toHref(url)} target="_blank" rel="noreferrer" className="message-link">
          {url}
        </a>
        {trailingPunctuation}
      </span>
    );
  });
}

function MessageText({ content }: { content: string }) {
  return normalizeMessage(content).split('\n').map((line, index, lines) => (
    <span key={`${line}-${index}`}>
      <MessageLine line={line} />
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(getSavedUserProfile);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('chatbot-hr-theme');
    return THEME_OPTIONS.some((option) => option.value === savedTheme)
      ? (savedTheme as ThemeMode)
      : 'system';
  });
  const sessionId = useMemo(generateUUID, []);
  const userAvatarSeed = useMemo(() => Math.random().toString(36).substring(7), []);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('chatbot-hr-user-profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem('chatbot-hr-theme', themeMode);
  }, [themeMode]);

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setUserProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const container = chatContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
  };

  const addMessage = (content: string, isUser = false, isError = false) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        content,
        isUser,
        isError,
        time: formatTime(),
      },
    ]);
    scrollToBottom();
  };

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    addMessage(trimmed, true);
    setMessage('');
    setIsSending(true);
    scrollToBottom();

    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}?session=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          timestamp: new Date().toISOString(),
          user: userProfile,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const data = (await response.json()) as { reply_to_user?: string; message?: string };
          addMessage(data.reply_to_user ?? data.message ?? 'ได้รับข้อมูลแล้วครับ ✅');
        } else {
          const text = await response.text();
          addMessage(text || 'ได้รับข้อมูลแล้วครับ ✅');
        }
      } else {
        addMessage(`เกิดข้อผิดพลาด: ${response.status}`, false, true);
      }
    } catch (error) {
      addMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', false, true);
      console.error('Error:', error);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-main">
          <div className="logo">
            <img src={logoUrl} alt="Fakduai HR" />
          </div>
          <div className="header-info">
            <h1>Fakduai HR</h1>
            <div className="status">
              <span className="status-dot" />
              <span>พร้อมให้บริการ</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <a
            className="calendar-link"
            href={LEAVE_CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
          >
            ปฏิทินการลา
          </a>

          <div className="theme-switcher" aria-label="เลือกธีม">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={themeMode === option.value ? 'active' : ''}
                onClick={() => setThemeMode(option.value)}
                aria-pressed={themeMode === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="chat-container" ref={chatContainerRef} aria-live="polite">
        <section className="profile-card" aria-label="ข้อมูลผู้ใช้งาน">
          <div className="profile-card-header">
            <div>
              <p className="profile-eyebrow">ข้อมูลผู้ใช้งาน</p>
              <h2>บอกข้อมูลของคุณก่อนเริ่มแชท</h2>
            </div>
            <span>เก็บไว้ในเบราว์เซอร์นี้</span>
          </div>

          <div className="profile-grid">
            <label>
              <span>ชื่อ</span>
              <input
                value={userProfile.firstName}
                onChange={(event) => handleProfileChange('firstName', event.target.value)}
                autoComplete="given-name"
                placeholder="ชื่อจริง"
              />
            </label>
            <label>
              <span>นามสกุล</span>
              <input
                value={userProfile.lastName}
                onChange={(event) => handleProfileChange('lastName', event.target.value)}
                autoComplete="family-name"
                placeholder="นามสกุล"
              />
            </label>
            <label>
              <span>ชื่อเล่น</span>
              <input
                value={userProfile.nickname}
                onChange={(event) => handleProfileChange('nickname', event.target.value)}
                autoComplete="nickname"
                placeholder="ชื่อเล่น"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={userProfile.email}
                onChange={(event) => handleProfileChange('email', event.target.value)}
                autoComplete="email"
                placeholder="name@company.com"
              />
            </label>
          </div>
        </section>

        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-card">
              <div className="empty-state-mark">
                <img src={logoUrl} alt="Fakduai HR" />
              </div>
              <p>สวัสดีครับ! พิมพ์ข้อความเพื่อเริ่มต้นใช้งาน</p>
              <div className="suggestion-row" aria-label="ตัวอย่างคำถาม">
                <span>ถามเรื่องวันลา</span>
                <span>สวัสดิการ</span>
                <span>เอกสาร HR</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((chatMessage) => (
            <article
              className={`message ${chatMessage.isUser ? 'user' : 'bot'}`}
              key={chatMessage.id}
            >
              <div className="message-avatar">
                <img
                  src={
                    chatMessage.isUser
                      ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${userAvatarSeed}`
                      : logoUrl
                  }
                  alt={chatMessage.isUser ? 'User' : 'HR Bot'}
                />
              </div>
              <div className="message-content">
                {chatMessage.isError ? (
                  <div className="error-message">
                    <MessageText content={chatMessage.content} />
                  </div>
                ) : (
                  <MessageText content={chatMessage.content} />
                )}
                <div className="message-time">{chatMessage.time}</div>
              </div>
            </article>
          ))
        )}

        {isSending ? (
          <article className="message bot">
            <div className="message-avatar">
              <img src={logoUrl} alt="HR Bot" />
            </div>
            <div className="message-content">
              <div className="typing-indicator" aria-label="กำลังพิมพ์">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </article>
        ) : null}
      </main>

      <form className="input-area" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <div className="input-container">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์ข้อความที่นี่..."
              rows={1}
            />
          </div>
          <button
            className="send-btn"
            disabled={isSending || !message.trim()}
            type="submit"
            aria-label="ส่งข้อความ"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            <span className="sr-only">ส่งข้อความ</span>
          </button>
        </div>
      </form>
    </div>
  );
}

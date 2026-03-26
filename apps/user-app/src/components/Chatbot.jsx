import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MessageCircle, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addUserMessage, closeChatbot, sendMessage } from '../features/chatbot/chatbotSlice';

function renderFormattedText(text = '') {
  const lines = String(text).split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      const items = [];
      let j = i;
      while (j < lines.length) {
        const m = lines[j].match(/^\s*[-*]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        j += 1;
      }
      out.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5">
          {items.map((item, idx) => <li key={`li-${i}-${idx}`}>{renderInline(item)}</li>)}
        </ul>
      );
      i = j - 1;
      continue;
    }

    if (!line.trim()) {
      out.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    out.push(<p key={`p-${i}`} className="leading-relaxed">{renderInline(line)}</p>);
  }

  return out;
}

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, idx) => {
    const strong = part.match(/^\*\*([^*]+)\*\*$/);
    return strong ? <strong key={`s-${idx}`} className="font-semibold">{strong[1]}</strong> : <span key={`t-${idx}`}>{part}</span>;
  });
}

export default function Chatbot() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { isOpen, messages, loading, error } = useSelector((s) => s.chatbot);
  const [text, setText] = useState('');
  const list = useMemo(() => messages.length ? messages : [{ role: 'assistant', content: t('chatbot.welcome') }], [messages, t]);
  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || loading) return;
    const lang = ['en', 'hi', 'mr'].includes(i18n.language) ? i18n.language : 'en';
    setText('');
    dispatch(addUserMessage(msg));
    const history = [...messages, { role: 'user', content: msg }].map(({ role, content }) => ({ role, content }));
    await dispatch(sendMessage({ message: msg, history, language: lang }));
  };
  if (!isOpen) return null;
  return <>
    <button className="fixed inset-0 z-40 bg-black/30" onClick={() => dispatch(closeChatbot())} aria-label="Close" />
    <section className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex h-[70vh] max-h-150 max-w-md flex-col" style={{ backgroundColor: 'var(--clay-bg)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.14), inset 0 2px 4px rgba(255,255,255,0.40)' }}>
      <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--clay-card)' }}><div className="flex items-center gap-2"><div className="clay-icon flex h-9 w-9 items-center justify-center" style={{ backgroundColor: 'var(--clay-card)', color: 'var(--clay-primary)' }}><MessageCircle className="h-5 w-5" /></div><div><p className="text-sm font-bold text-black">{t('chatbot.title')}</p><p className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{i18n.language.toUpperCase()}</p></div></div><button onClick={() => dispatch(closeChatbot())} className="clay-btn-round inline-flex h-8 w-8 items-center justify-center"><X className="h-4 w-4" /></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{list.map((m, i) => <div key={m.id || i} className={`max-w-[80%] rounded-[18px] px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto text-white' : 'text-black'}`} style={m.role === 'user' ? { background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))', borderRadius: '18px 18px 4px 18px' } : { backgroundColor: 'var(--clay-card)', borderRadius: '18px 18px 18px 4px' }}>{m.role === 'assistant' ? renderFormattedText(m.content) : m.content}</div>)}{loading && <div className="max-w-[80%] rounded-[18px] px-3 py-2 text-sm text-black" style={{ backgroundColor: 'var(--clay-card)' }}>...</div>}{error && <div className="text-xs" style={{ color: '#A32D2D' }}>{error}</div>}</div>
      <div className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--clay-card)' }}><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }} placeholder={t('chatbot.placeholder')} className="clay-lang-box h-11 flex-1 px-3 text-sm text-black outline-none" /><button disabled={!text.trim() || loading} onClick={handleSend} className="clay-btn-round inline-flex h-11 w-11 items-center justify-center text-white disabled:opacity-60" style={{ backgroundColor: 'var(--clay-accent)' }}><Send className="h-5 w-5" /></button></div>
    </section>
  </>;
}

import { useDispatch } from 'react-redux';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toggleChatbot } from '../features/chatbot/chatbotSlice';
import Chatbot from './Chatbot';
import NotificationCenter from './NotificationCenter';

export default function ProtectedLayout({ children }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return (
    <>
      {children}
      <NotificationCenter />

      {/* Floating Chatbot FAB — persists across all protected pages */}
      <button
        type="button"
        onClick={() => dispatch(toggleChatbot())}
        className="clay-fab fixed bottom-4 right-4 inline-flex h-14 w-14 items-center justify-center text-green-50 sm:bottom-5 sm:right-5 z-30"
        aria-label={t('chatbotOpen')}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chatbot panel — always mounted, Redux controls open/close */}
      <Chatbot />
    </>
  );
}

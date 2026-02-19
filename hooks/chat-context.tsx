import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { Chat, Message } from '@/types/models';
import { useAuth } from '@/hooks/auth-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse, clearCorruptedData, clearAllAppData } from '@/utils/storage';

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  isLoading: boolean;
  createChat: (type: Chat['type'], name: string, memberIds: string[], eventId?: string) => Chat;
  sendMessage: (chatId: string, text: string) => void;
  getMessages: (chatId: string) => Message[];
  markAsRead: (chatId: string) => void;
}

export const [ChatProvider, useChat] = createContextHook<ChatState>(() => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, [user]);

  const getDefaultChats = (): Chat[] => [
    {
      id: 'event_e1',
      type: 'event',
      name: 'Cosmic Friday Event Chat',
      memberIds: ['user1'],
      eventId: 'e1',
      createdAt: new Date(),
      lastMessage: 'Who\'s going tonight?',
      lastMessageTime: new Date(),
      unreadCount: 2,
      avatarUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=200',
    },
    {
      id: 'group_1',
      type: 'group',
      name: 'Miami Night Crew',
      memberIds: ['user1', 'user2', 'user3'],
      createdAt: new Date(),
      lastMessage: 'Let\'s meet at 11pm',
      lastMessageTime: new Date(Date.now() - 3600000),
      unreadCount: 0,
    },
  ];

  const loadChats = async () => {
    try {
      const stored = await AsyncStorage.getItem('chats');
      const defaultChats = getDefaultChats();
      
      // Handle corrupted data
      if (stored && (stored.startsWith('object') || stored.includes('Unexpected character'))) {
        console.warn('Detected corrupted chats data, using default chats');
        await clearCorruptedData('chats');
        setChats(defaultChats);
        await AsyncStorage.setItem('chats', JSON.stringify(defaultChats));
        setIsLoading(false);
        return;
      }
      
      const parsedChats = safeJsonParse<Chat[]>(stored, defaultChats);
      
      if (Array.isArray(parsedChats)) {
        setChats(parsedChats);
        
        // Load messages for each chat
        const messagesData: Record<string, Message[]> = {};
        for (const chat of parsedChats) {
          const chatMessages = await AsyncStorage.getItem(`messages_${chat.id}`);
          
          // Handle corrupted message data
          if (chatMessages && (chatMessages.startsWith('object') || chatMessages.includes('Unexpected character'))) {
            console.warn(`Detected corrupted messages for chat ${chat.id}, clearing`);
            await clearCorruptedData(`messages_${chat.id}`);
            messagesData[chat.id] = [];
            continue;
          }
          
          const parsedMessages = safeJsonParse<Message[]>(chatMessages, []);
          if (Array.isArray(parsedMessages)) {
            messagesData[chat.id] = parsedMessages;
          } else if (chatMessages && chatMessages.trim()) {
            console.error(`Failed to parse messages for chat ${chat.id}`);
            await clearCorruptedData(`messages_${chat.id}`);
            messagesData[chat.id] = [];
          }
        }
        setMessages(messagesData);
      } else {
        console.warn('Invalid chats data format, using default chats');
        if (stored && stored.trim()) {
          await clearCorruptedData('chats');
        }
        setChats(defaultChats);
        await AsyncStorage.setItem('chats', JSON.stringify(defaultChats));
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      const defaultChats = getDefaultChats();
      setChats(defaultChats);
      await AsyncStorage.setItem('chats', JSON.stringify(defaultChats));
    } finally {
      setIsLoading(false);
    }
  };

  const createChat = (type: Chat['type'], name: string, memberIds: string[], eventId?: string): Chat => {
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      type,
      name,
      memberIds: [...memberIds, user?.id || ''],
      eventId,
      createdAt: new Date(),
    };
    
    const updated = [...chats, newChat];
    setChats(updated);
    AsyncStorage.setItem('chats', JSON.stringify(updated));
    
    return newChat;
  };

  const sendMessage = (chatId: string, text: string) => {
    if (!user) return;
    
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      chatId,
      senderId: user.id,
      senderName: user.name,
      text,
      createdAt: new Date(),
    };
    
    const chatMessages = messages[chatId] || [];
    const updatedMessages = [...chatMessages, newMessage];
    
    setMessages(prev => ({ ...prev, [chatId]: updatedMessages }));
    AsyncStorage.setItem(`messages_${chatId}`, JSON.stringify(updatedMessages));
    
    // Update chat's last message
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, lastMessage: text, lastMessageTime: new Date(), unreadCount: 0 }
        : chat
    ));
  };

  const getMessages = (chatId: string): Message[] => {
    return messages[chatId] || [];
  };

  const markAsRead = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  };

  return {
    chats,
    messages,
    isLoading,
    createChat,
    sendMessage,
    getMessages,
    markAsRead,
  };
});
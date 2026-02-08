import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { ChatMessage, ChatSession, ContentItem } from '@/types';

interface ChatContextType {
  chatSessions: ChatSession[];
  currentChatId: string | null;
  currentMessages: ChatMessage[];
  createNewChat: (moduleId?: string, contentIds?: string[]) => string;
  loadChat: (chatId: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  deleteChat: (chatId: string) => void;
  getCurrentChatContext: () => { moduleId?: string; contentIds?: string[] };
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'ai_tutor_chats';

// Initialize with some mock data
const getInitialChats = (): ChatSession[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  
  // Default mock chats
  return [
    {
      id: 'chat-1',
      title: 'React Hooks Discussion',
      moduleCode: 'WEB201T',
      moduleId: '3',
      lastMessage: 'Can you explain useEffect dependencies?',
      timestamp: '2025-01-20 14:30',
      createdAt: new Date().toISOString(),
      contentIds: ['5'],
      messages: [
        {
          id: 'm1',
          content: "Hello! I'm your AI Tutor. I see you're studying React Components Tutorial. How can I help you today?",
          sender: 'ai',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'm2',
          content: 'Can you explain useEffect dependencies?',
          sender: 'user',
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          moduleCode: 'WEB201T',
        },
        {
          id: 'm3',
          content: "Great question! useEffect dependencies are the values that React watches to determine when to re-run your effect. When any dependency changes, the effect runs again. If you pass an empty array [], the effect only runs once on mount. If you omit the array entirely, it runs after every render.",
          sender: 'ai',
          timestamp: new Date(Date.now() - 3400000).toISOString(),
        },
      ],
    },
    {
      id: 'chat-2',
      title: 'Data Structures Help',
      moduleCode: 'DSA320C',
      moduleId: '2',
      lastMessage: 'How do I implement a binary search tree?',
      timestamp: '2025-01-19 10:15',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      contentIds: ['4'],
      messages: [
        {
          id: 'm4',
          content: "Hello! I'm here to help with Data Structures & Algorithms. What would you like to learn?",
          sender: 'ai',
          timestamp: new Date(Date.now() - 90000000).toISOString(),
        },
        {
          id: 'm5',
          content: 'How do I implement a binary search tree?',
          sender: 'user',
          timestamp: new Date(Date.now() - 89000000).toISOString(),
          moduleCode: 'DSA320C',
        },
        {
          id: 'm6',
          content: "A Binary Search Tree (BST) is a tree where each node has at most 2 children, and for each node: all left descendants are smaller, all right descendants are larger. Here's the basic structure: create a Node class with value, left, and right properties. Then create a BST class with insert, search, and delete methods.",
          sender: 'ai',
          timestamp: new Date(Date.now() - 88000000).toISOString(),
        },
      ],
    },
  ];
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(getInitialChats);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  const createNewChat = useCallback((moduleId?: string, contentIds?: string[]): string => {
    const module = moduleId ? mockModules.find(m => m.id === moduleId) : null;
    const contentItems = contentIds 
      ? contentIds.map(id => mockContent.find(c => c.id === id)).filter(Boolean) as ContentItem[]
      : [];
    
    const title = contentItems.length > 0 
      ? `Chat about ${contentItems[0].title}${contentItems.length > 1 ? ` (+${contentItems.length - 1})` : ''}`
      : module 
        ? `${module.code} Discussion`
        : 'New Chat';
    
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: contentItems.length > 0
        ? `Hello! I'm your AI Tutor. I see you're studying "${contentItems.map(c => c.title).join(', ')}". How can I help you understand this material better?`
        : module
          ? `Hello! I'm your AI Tutor for ${module.name} (${module.code}). What would you like to learn today?`
          : "Hello! I'm your AI Tutor. Select a module or content to get started, then ask me anything!",
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };

    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title,
      moduleCode: module?.code || '',
      moduleId: moduleId,
      lastMessage: welcomeMessage.content.substring(0, 50) + '...',
      timestamp: new Date().toLocaleString(),
      createdAt: new Date().toISOString(),
      contentIds: contentIds,
      messages: [welcomeMessage],
    };

    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setCurrentMessages([welcomeMessage]);

    return newChat.id;
  }, []);

  const loadChat = useCallback((chatId: string) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setCurrentMessages(chat.messages);
    }
  }, [chatSessions]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!currentChatId) return;

    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    setCurrentMessages(prev => [...prev, newMessage]);
    
    setChatSessions(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const updatedMessages = [...chat.messages, newMessage];
        return {
          ...chat,
          messages: updatedMessages,
          lastMessage: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
          timestamp: new Date().toLocaleString(),
        };
      }
      return chat;
    }));
  }, [currentChatId]);

  const deleteChat = useCallback((chatId: string) => {
    setChatSessions(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setCurrentMessages([]);
    }
  }, [currentChatId]);

  const getCurrentChatContext = useCallback(() => {
    const chat = chatSessions.find(c => c.id === currentChatId);
    return {
      moduleId: chat?.moduleId,
      contentIds: chat?.contentIds,
    };
  }, [chatSessions, currentChatId]);

  return (
    <ChatContext.Provider
      value={{
        chatSessions,
        currentChatId,
        currentMessages,
        createNewChat,
        loadChat,
        addMessage,
        deleteChat,
        getCurrentChatContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
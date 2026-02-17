import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Send,
    Plus,
    MoreVertical,
    Sparkles,
    Trash2,
    AlertCircle,
    MessageSquare,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import SelectedContentBar from "@/components/content/SelectedContentBar";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AIMessageRenderer } from "@/components/AIMessageRenderer";
import { useContentSelection } from "@/contexts/ContentSelectionContext";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ChatSidebarEnhanced } from "@/components/chat/ChatSidebarEnhanced";
import { EmptyStateOnboarding } from "@/components/chat/EmptyStateOnboarding";

interface ChatSession {
    id?: string;
    chatId?: string;
    sessionId?: string;
    title?: string;
    topic?: string;
    lastMessage?: string;
    timestamp?: string;
    createdAt?: number;
    updatedAt?: number;
    moduleCode?: string;
    moduleId?: string;
    contentIds?: string;
    messageCount?: number;
}

interface ChatMessage {
    id?: string;
    messageId?: string;
    content: string;
    sender: "user" | "ai";
    timestamp?: string;
}

const funLoadingMessages = [
    "AI Tutor is thinking...",
    "Consulting the knowledge base...",
    "Preparing a helpful response...",
];

const Chat: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const urlModuleCode = searchParams.get("moduleCode");
    const urlContentIds = searchParams.get("contentIds");
    const urlChatId = searchParams.get("chatId");

    const { selectedContent, setSelectedContent, clearSelection } = useContentSelection();

    const {
        get: getChats,
        post: postChat,
        del: deleteChat,
        loading: apiLoading,
    } = useApi<ChatSession[]>();
    const { get: getMessages, post: postMessage } = useApi<ChatMessage[]>();

    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(urlChatId);
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
    const [isDataReady, setIsDataReady] = useState(false);

    const [message, setMessage] = useState("");
    const [selectedModule, setSelectedModule] = useState<string>(urlModuleCode || "");
    const [selectedModuleId, setSelectedModuleId] = useState<string>("");
    const [modules, setModules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAITyping, setIsAITyping] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(funLoadingMessages[0]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [lastMessageTime, setLastMessageTime] = useState<number>(0);
    const MIN_MESSAGE_INTERVAL = 1000;

    useEffect(() => {
        loadChats();
        loadModules();
    }, []);

    const loadModules = async () => {
        try {
            const data = await getChats("/api/student/modules");
            setModules(data || []);

            if (urlModuleCode && data && data.length > 0) {
                const matchedModule = data.find((m: any) =>
                    m.code === urlModuleCode || m.moduleCode === urlModuleCode
                );
                if (matchedModule) {
                    setSelectedModule(matchedModule.code || matchedModule.moduleCode || "");
                }
            }
        } catch (err) {
            setModules([]);
        }
    };

    useEffect(() => {
        const initializeChat = async () => {
            if (urlChatId) {
                // Loading is handled by loadChat itself
                await loadChat(urlChatId);
            } else if (urlContentIds || urlModuleCode) {
                setIsLoading(true);
                try {
                    if (urlModuleCode && !selectedModule) {
                        setSelectedModule(urlModuleCode);
                    }

                    if (urlContentIds && urlModuleCode) {
                        try {
                            // Fetch content details from the module
                            const moduleData = await getChats(`/api/student/modules/${urlModuleCode}/content`);
                            const files = moduleData?.files || [];
                            const contentIdArray = urlContentIds.split(',').map(id => id.trim());
                            
                            // Map IDs to actual content items with proper names
                             const contentItems = contentIdArray.map(id => {
                                 const contentItem = files.find((item: any) => item.fileId === id || item.id === id);
                                 return {
                                     id,
                                     name: contentItem?.title || contentItem?.fileName || id,
                                     title: contentItem?.title || contentItem?.fileName || id,
                                     type: contentItem?.fileType || contentItem?.type || 'file',
                                 };
                             });
                            setSelectedContent(contentItems);
                        } catch (error) {
                            console.error('Failed to fetch content details:', error);
                            // Fallback to using IDs as names
                            const contentIdArray = urlContentIds.split(',').map(id => id.trim());
                            const contentItems = contentIdArray.map(id => ({
                                id,
                                name: id,
                                title: id,
                                type: 'file',
                            }));
                            setSelectedContent(contentItems);
                        }
                    } else if (urlContentIds) {
                        // No module code, fallback to using IDs
                        const contentIdArray = urlContentIds.split(',').map(id => id.trim());
                        const contentItems = contentIdArray.map(id => ({
                            id,
                            name: id,
                            title: id,
                            type: 'file',
                        }));
                        setSelectedContent(contentItems);
                    }
                    setIsDataReady(true);
                    setIsLoading(false);
                } catch (error) {
                    console.error('Failed to initialize chat:', error);
                    setIsLoading(false);
                }
            }
        };
        
        initializeChat();
    }, [urlChatId, urlContentIds, urlModuleCode, setSelectedContent, getChats]);

    // Clear selectedContent when navigating to /chat without any URL parameters
    useEffect(() => {
        if (!urlChatId && !urlContentIds && !urlModuleCode) {
            // No URL parameters - clear the selected content
            setSelectedContent([]);
        }
    }, [urlChatId, urlContentIds, urlModuleCode, setSelectedContent]);

    // Removed URL update useEffect - the URL is now ONLY updated by handleSelectChat
    // and handleNewChat. This prevents circular dependency loops that cause auto-revert.

    const loadChats = async () => {
        try {
            const data = await getChats("/api/chat");
            setChatSessions(data || []);
        } catch (err) {
            toast.error("Failed to load chat history");
        }
    };

    const createNewChat = async (moduleId?: string, contentIds?: string) => {
        try {
            const payload: any = { title: "New Chat" };
            if (moduleId) payload.moduleId = moduleId;
            if (contentIds) payload.contentIds = contentIds.split(",");

            const newChat = await postChat("/api/chat", payload);
            await loadChats();
            const sessionId = (newChat as any)?.sessionId;
            if (!sessionId) throw new Error('Chat creation failed');
            return sessionId;
        } catch (err) {
            console.error('createNewChat error:', err);
            toast.error("Failed to create chat");
            return null;
        }
    };

    const loadChat = async (chatId: string) => {
        try {
            console.log('loadChat called:', { chatId, currentChatId, isDataReady, messageCount: currentMessages.length });
            
            // Check if this is a different chat being loaded
            const isDifferentChat = currentChatId !== chatId;
            
            // Skip only if loading the exact same chat that's already fully loaded
            if (!isDifferentChat && isDataReady && currentMessages.length > 0) {
                console.log('Chat already loaded, skipping');
                return;
            }
            
            // Always clear messages when loading (whether same or different chat)
            setIsLoading(true);
            setIsDataReady(false);
            setCurrentMessages([]);

            let session: any = null;
            try {
                const chatData = await getChats(`/api/chat/${chatId}`);
                session = chatData;
            } catch (err) {
                console.warn('Failed to fetch chat metadata, trying cached sessions:', err);
                session = chatSessions.find(s => s.sessionId === chatId);
            }

            if (session?.moduleCode) {
                setSelectedModule(session.moduleCode);
            } else if (session?.moduleId) {
                // Look up module code from modules list by moduleId
                const moduleForSession = modules.find(m => 
                    m.id === session.moduleId || m.moduleId === session.moduleId
                );
                setSelectedModule(moduleForSession?.code || moduleForSession?.moduleCode || session.moduleId);
            } else {
                setSelectedModule("");
            }

            if (session?.contentIds) {
                const contentIdArray = Array.isArray(session.contentIds)
                    ? session.contentIds
                    : typeof session.contentIds === 'string'
                        ? session.contentIds.split(',')
                        : [];

                if (contentIdArray.length > 0) {
                    try {
                        const fileMap: { [key: string]: { name: string; isOrphaned: boolean } } = {};

                        if (modules.length > 0) {
                            try {
                                const contentPromises = modules.map(m =>
                                    getChats(`/api/student/modules/${m.code || m.moduleCode}/content`).catch(() => null)
                                );
                                const allModuleContents = await Promise.all(contentPromises);

                                allModuleContents.forEach((moduleContent: any) => {
                                    if (moduleContent?.files && Array.isArray(moduleContent.files)) {
                                        moduleContent.files.forEach((file: any) => {
                                            fileMap[file.fileId] = {
                                                name: file.fileName || file.fileId,
                                                isOrphaned: false,
                                            };
                                        });
                                    }
                                });
                            } catch (moduleErr) {
                                console.warn('Failed to fetch module contents:', moduleErr);
                            }
                        }

                        console.log('🗺️ Master file map from modules:', fileMap);
                        console.log('📌 Looking up fileIds:', contentIdArray);

                        const missingIds = contentIdArray.filter(id => !fileMap[id.trim()]);
                        if (missingIds.length > 0) {
                            console.warn(`⚠️ ${missingIds.length} file(s) not found in modules, trying fallback API...`);

                            const fallbackPromises = missingIds.map((id: string) =>
                                getChats(`/api/file/${id.trim()}`).catch(() => null)
                            );
                            const fallbackResults = await Promise.all(fallbackPromises);

                            fallbackResults.forEach((file: any, idx) => {
                                const fileId = missingIds[idx].trim();
                                if (file) {
                                    fileMap[fileId] = {
                                        name: file.fileName || fileId,
                                        isOrphaned: true,
                                    };
                                    console.log(`✅ Fallback found: ${fileId} → ${file.fileName}`);
                                } else {
                                    console.warn(`❌ Fallback failed for: ${fileId}`);
                                    fileMap[fileId] = {
                                        name: 'File unavailable',
                                        isOrphaned: true,
                                    };
                                }
                            });
                        }

                        const enrichedItems = contentIdArray.map((id: string) => {
                            const trimmedId = id.trim();
                            const fileInfo = fileMap[trimmedId];
                            const found = fileInfo ? '✅' : '❌';
                            const displayName = fileInfo?.name || 'File unavailable';
                            console.log(`${found} ID "${trimmedId}" → "${displayName}" (orphaned: ${fileInfo?.isOrphaned})`);

                            return {
                                id: trimmedId,
                                title: displayName,
                                name: displayName,
                                type: 'file',
                                isOrphaned: fileInfo?.isOrphaned || false,
                            };
                        });

                        console.log('✅ Enriched items:', enrichedItems);
                        setSelectedContent(enrichedItems);
                    } catch (err) {
                        console.warn('Failed to resolve file names:', err);
                        setSelectedContent(contentIdArray.map((id: string) => ({
                            id: id.trim(),
                            title: 'File unavailable',
                            name: 'File unavailable',
                            type: 'file',
                            isOrphaned: true,
                        })));
                    }
                } else {
                    console.log('ℹ️ Session has no contentIds - clearing selection');
                }
            } else {
                // Chat has no contentIds - clear selected content to avoid showing previous chat's content
                setSelectedContent([]);
            }

            const messages = await getMessages(`/api/chat/${chatId}/messages?limit=100&page=1`);
            console.log('Messages loaded:', messages);

            const displayMessages: ChatMessage[] = (messages || []).map((msg: any) => ({
                id: msg.messageId,
                messageId: msg.messageId,
                content: msg.content,
                sender: msg.role === 'user' ? 'user' : 'ai',
                timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
            }));

            console.log('Display messages:', displayMessages);
            setCurrentChatId(chatId);
            setCurrentMessages(displayMessages);
            console.log('🔧 Setting isDataReady=true, isLoading=false');
            setIsDataReady(true);
            setIsLoading(false);
            console.log('✅ Data ready - content and messages loaded');
        } catch (err) {
            console.error('❌ Error loading chat:', err);
            toast.error("Failed to load messages");
            setIsLoading(false);
            setIsDataReady(false);
        }
    };

    const addMessage = async (messageContent: string) => {
        try {
            let chatId = currentChatId;
            
            // If no chat exists yet, create one on first message
            if (!chatId) {
                const moduleIdForChat = selectedModuleId || undefined;
                const contentIdsForChat = selectedContent.map(c => c.id).join(',') || undefined;
                chatId = await createNewChat(moduleIdForChat, contentIdsForChat);
                if (!chatId) {
                    toast.error("Failed to create chat session");
                    return;
                }
                setCurrentChatId(chatId);
            }

            const userMsg: ChatMessage = {
                id: `msg-${Date.now()}`,
                messageId: `msg-${Date.now()}`,
                content: messageContent,
                sender: 'user',
                timestamp: new Date().toISOString(),
            };

            setCurrentMessages((prev) => [...prev, userMsg]);
            setIsAITyping(true);

            const response = await postMessage(`/api/chat/${chatId}/messages`, {
                message: messageContent,
            });

            console.log('Response from backend:', response);
            if (response && response.userMessage && response.assistantMessage) {
                setCurrentMessages((prev) => {
                    const withoutTemp = prev.filter((msg) => msg.content !== messageContent || msg.sender !== 'user');
                    return [
                        ...withoutTemp,
                        {
                            id: response.userMessage.messageId,
                            messageId: response.userMessage.messageId,
                            content: response.userMessage.content,
                            sender: 'user' as const,
                            timestamp: response.userMessage.createdAt,
                        },
                        {
                            id: response.assistantMessage.messageId,
                            messageId: response.assistantMessage.messageId,
                            content: response.assistantMessage.content,
                            sender: 'ai' as const,
                            timestamp: response.assistantMessage.createdAt,
                        },
                    ];
                });

                setChatSessions((prev) => {
                    const chatExists = prev.some(chat => chat.sessionId === chatId);
                    const updated = prev.map((chat) => {
                        if (chat.sessionId === chatId) {
                            return {
                                ...chat,
                                lastMessage: response.assistantMessage.content,
                                updatedAt: Date.now(),
                            };
                        }
                        return chat;
                    });
                    
                    // If chat doesn't exist yet (new chat), reload the list
                    if (!chatExists) {
                        loadChats();
                    }
                    
                    return updated;
                });
            }

            // Generate title for the chat if it doesn't have one yet
            if (chatId && (!currentMessages[0] || currentMessages[0]?.sender === 'ai')) {
                // After first exchange, generate a descriptive title
                try {
                    await postMessage(`/api/chat/${chatId}/generate-title`, {});
                    // Reload chats to show the updated title
                    await loadChats();
                } catch (err) {
                    console.warn('Failed to generate chat title:', err);
                    // Not critical, continue without error
                }
            }

            setIsAITyping(false);
        } catch (err) {
            setIsAITyping(false);
            toast.error("Failed to send message");
        }
    };

    useEffect(() => {
        if (isAITyping) {
            const interval = setInterval(() => {
                setLoadingMessage(
                    funLoadingMessages[Math.floor(Math.random() * funLoadingMessages.length)]
                );
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isAITyping]);

    const hasContext = selectedModule || selectedContent.length > 0 || currentChatId;

    const validateMessage = (content: string): { valid: boolean; error?: string } => {
        if (!content || !content.trim()) {
            return { valid: false, error: 'Message cannot be empty' };
        }
        if (content.length > 5000) {
            return { valid: false, error: 'Message too long (max 5000 chars)' };
        }
        const xssPatterns = [/<script/i, /javascript:/i, /onerror=/i, /onload=/i, /onclick=/i];
        for (const pattern of xssPatterns) {
            if (pattern.test(content)) {
                return { valid: false, error: 'Message contains invalid content' };
            }
        }
        return { valid: true };
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !hasContext) return;

        const now = Date.now();
        if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
            toast.error('Please wait before sending another message');
            return;
        }
        setLastMessageTime(now);

        const validation = validateMessage(message);
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        const userMessage = message;
        setMessage("");
        setIsAITyping(true);

        try {
            await addMessage(userMessage);
        } catch (err) {
            setIsAITyping(false);
        }
    };

    const handleDeleteChat = (chatId: string) => {
        setChatToDelete(chatId);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteChat = async () => {
        if (!chatToDelete || !chatToDelete.trim()) {
            toast.error("Invalid chat ID");
            setDeleteDialogOpen(false);
            return;
        }

        try {
            setDeleteDialogOpen(false);
            setChatToDelete(null);

            await deleteChat(`/api/chat/${chatToDelete}`);

            setChatSessions(prev =>
                prev.filter(s => s.sessionId !== chatToDelete)
            );

            if (currentChatId === chatToDelete) {
                setCurrentChatId(null);
                setCurrentMessages([]);
                setSelectedModule("");
                setSelectedModuleId("");
                setSelectedContent([]);
                navigate('/chat', { replace: true });
            }

            await loadChats();
            toast.success("Chat deleted");
        } catch (err) {
            console.error('Delete error:', err);
            toast.error("Failed to delete chat");
            await loadChats();
        }
    };

    const handleNewChat = () => {
        // Reset chat state for new conversation
        // Don't create chat until first message is sent
        setCurrentChatId(null);
        setCurrentMessages([]);
        setMessage("");
        clearSelection();
        navigate("/chat");
        setIsMobileSidebarOpen(false);
    };

    const handleSelectChat = async (session: ChatSession) => {
        const sessionId = session.sessionId;
        if (sessionId) {
            // Just update the URL - let the initialization useEffect handle loading the chat
            // This prevents duplicate loadChat calls and race conditions
            navigate(`/chat?chatId=${sessionId}`);
            setIsMobileSidebarOpen(false);
        }
    };

    const ChatSidebarContent = () => (
        <ChatSidebarEnhanced
            chatSessions={chatSessions}
            currentChatId={urlChatId}
            onSelectChat={(chatId) => {
                const session = chatSessions.find((s) => (s.sessionId || s.chatId || s.id) === chatId);
                if (session) {
                    handleSelectChat(session);
                    setIsMobileSidebarOpen(false);
                }
            }}
            onDeleteChat={(chatId) => {
                setChatToDelete(chatId);
                setDeleteDialogOpen(true);
            }}
            onCreateNewChat={handleNewChat}
        />
    );

    // Don't show loading overlay - let it show content beneath while loading
    // if (isLoading) {
    //     return (
    //         <MainLayout>
    //             <div className="flex-1 flex items-center justify-center">
    //                 <LoadingSpinner message="Loading chat..." />
    //             </div>
    //         </MainLayout>
    //     );
    // }

    return (
        <MainLayout
            rightSidebar={
                <aside className="hidden lg:flex w-72 h-full bg-sidebar border-l border-sidebar-border flex-col">
                    <ChatSidebarContent />
                </aside>
            }
        >
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                                Get Smarter with <span className="text-gradient">AI Tutor</span>
                            </h1>
                            <p className="text-muted-foreground text-xs md:text-sm mt-1">
                                Ask questions and enhance your learning
                            </p>
                        </div>
                        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="lg:hidden">
                                    <MessageSquare className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80 p-0 bg-sidebar">
                                <SheetHeader className="p-4 border-b border-sidebar-border">
                                    <SheetTitle>Chat History</SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col h-[calc(100%-60px)]">
                                    <ChatSidebarContent />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {(selectedContent.length > 0 || isDataReady || selectedModule) && !isLoading && (
                    <div className="px-4 md:px-6 pt-4 space-y-3">
                        {selectedContent.length > 0 && <SelectedContentBar />}
                        {selectedModule && selectedContent.length === 0 && (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                        Using all content from {selectedModule}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
                    {console.log('🔍 Render state:', { isDataReady, isLoading, messagesCount: currentMessages.length, isAITyping, currentChatId })}
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <LoadingSpinner message="Loading messages..." />
                        </div>
                    ) : currentMessages.length === 0 && !isAITyping ? (
                        <EmptyStateOnboarding
                            hasContext={hasContext}
                            onBrowseContent={() => navigate('/modules')}
                            onSuggestedPrompt={(prompt) => {
                                setMessage(prompt);
                                setTimeout(() => {
                                    const inputElement = document.querySelector(
                                        'input[placeholder*="question"]'
                                    ) as HTMLInputElement;
                                    inputElement?.focus();
                                }, 100);
                            }}
                        />
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-4">
                            {console.log('📝 Rendering messages container with', currentMessages.length, 'messages')}
                            {currentMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-2 md:gap-3 animate-slide-up",
                                        msg.sender === "user" ? "flex-row-reverse" : ""
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0",
                                            msg.sender === "ai"
                                                ? "bg-primary/20 text-primary"
                                                : "bg-secondary text-muted-foreground"
                                        )}
                                    >
                                        {msg.sender === "ai" ? (
                                            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                                        ) : (
                                            <span className="text-xs md:text-sm font-medium">U</span>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl",
                                            msg.sender === "ai"
                                                ? "bg-card border border-border rounded-tl-sm"
                                                : "bg-primary text-primary-foreground rounded-tr-sm"
                                        )}
                                    >
                                        {msg.sender === "ai" ? (
                                            <AIMessageRenderer content={msg.content} />
                                        ) : (
                                            <p className="text-xs md:text-sm leading-relaxed">
                                                {msg.content}
                                            </p>
                                        )}
                                        {msg.timestamp && (
                                            <p className="text-xs opacity-70 mt-2">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isAITyping && (
                                <div className="flex gap-2 md:gap-3">
                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/20 text-primary">
                                        <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div className="max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl bg-card border border-border rounded-tl-sm">
                                        <p className="text-xs md:text-sm leading-relaxed text-muted-foreground animate-pulse">
                                            {loadingMessage}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 md:p-6">
                    {!hasContext && (
                        <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0" />
                            <p className="text-xs md:text-sm text-warning">
                                Please select a module or content items to provide context.
                            </p>
                        </div>
                    )}
                    <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
                        <Select 
                            value={selectedModule} 
                            onValueChange={(code) => {
                                setSelectedModule(code);
                                const module = modules.find(m => (m.code || m.moduleCode) === code);
                                setSelectedModuleId(module?.id || module?.moduleId || "");
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-56">
                                <SelectValue placeholder="Select module to provide context" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {modules.length > 0 ? (
                                    modules.map((module) => (
                                        <SelectItem
                                            key={module.id || module.moduleId}
                                            value={module.code || module.moduleCode || ""}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {module.code || module.moduleCode}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {module.name || module.moduleName}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-muted-foreground">
                                        No modules available
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        <div className="flex-1 relative">
                            <Input
                                type="text"
                                placeholder={
                                    hasContext
                                        ? "Enter your question..."
                                        : "Select context first..."
                                }
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                className="pr-12"
                                disabled={!hasContext}
                            />
                            <Button
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={handleSendMessage}
                                disabled={!hasContext || !message.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border max-w-[90vw] sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this chat? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteChat}
                            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default Chat;

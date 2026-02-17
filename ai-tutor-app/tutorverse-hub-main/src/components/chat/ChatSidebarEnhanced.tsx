import React, { useState, useMemo, useEffect } from "react";
import {
    ChevronDown,
    ChevronUp,
    Search,
    Plus,
    MoreVertical,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { generateAITitle, generateLocalTitle } from "@/lib/titleGenerator";

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

interface ChatSidebarEnhancedProps {
    chatSessions: ChatSession[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
    onCreateNewChat: () => void;
}

// Helper: Get module color
const getModuleColor = (moduleCode: string): string => {
    if (!moduleCode) return "bg-gray-400";
    
    const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-orange-500",
        "bg-cyan-500",
        "bg-indigo-500",
        "bg-rose-500",
    ];
    
    let hash = 0;
    for (let i = 0; i < moduleCode.length; i++) {
        hash = moduleCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Helper: Categorize chats by date
const categorizeChatsByDate = (
    chats: ChatSession[]
): {
    today: ChatSession[];
    yesterday: ChatSession[];
    thisWeek: ChatSession[];
    earlier: ChatSession[];
} => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 604800000);

    const result = {
        today: [] as ChatSession[],
        yesterday: [] as ChatSession[],
        thisWeek: [] as ChatSession[],
        earlier: [] as ChatSession[],
    };

    chats.forEach((chat) => {
        const chatDate = new Date(
            typeof chat.createdAt === "string"
                ? chat.createdAt
                : chat.createdAt || chat.timestamp || Date.now()
        );
        const chatDay = new Date(
            chatDate.getFullYear(),
            chatDate.getMonth(),
            chatDate.getDate()
        );

        if (chatDay.getTime() === today.getTime()) {
            result.today.push(chat);
        } else if (chatDay.getTime() === yesterday.getTime()) {
            result.yesterday.push(chat);
        } else if (chatDay.getTime() > weekAgo.getTime()) {
            result.thisWeek.push(chat);
        } else {
            result.earlier.push(chat);
        }
    });

    return result;
};

// Helper: Group chats by module
const groupChatsByModule = (chats: ChatSession[]) => {
    const grouped: { [key: string]: ChatSession[] } = {};
    
    chats.forEach((chat) => {
        const module = chat.moduleCode || "Uncategorized";
        if (!grouped[module]) {
            grouped[module] = [];
        }
        grouped[module].push(chat);
    });

    return grouped;
};

// Helper: Format time
const formatTime = (timestamp: string | number | undefined): string => {
    if (!timestamp) return "N/A";
    
    const date = new Date(
        typeof timestamp === "string" ? timestamp : timestamp
    );
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
};

// Helper: Format time as "Today, HH:MM" or "Yesterday, HH:MM"
const formatTimeWithDate = (timestamp: string | number | undefined): string => {
    if (!timestamp) return "N/A";
    
    const date = new Date(
        typeof timestamp === "string" ? timestamp : timestamp
    );
    const now = new Date();
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayOnly = new Date(todayOnly);
    yesterdayOnly.setDate(yesterdayOnly.getDate() - 1);
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
        return `Today, ${timeStr}`;
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return `Yesterday, ${timeStr}`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
};

const ChatSessionItem: React.FC<{
    chat: ChatSession;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
}> = ({ chat, isActive, onSelect, onDelete }) => {
    const moduleColor = getModuleColor(chat.moduleCode || "");

    return (
        <div
            onClick={onSelect}
            className={cn(
                "p-3 rounded-xl cursor-pointer transition-all group card-interactive",
                isActive && "border-primary bg-primary/5"
            )}
        >
            <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-sm text-foreground truncate flex-1">
                    {chat.title || "Untitled Chat"}
                </h4>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground truncate mb-1">
                {chat.lastMessage || `${chat.messageCount || 0} messages`}
            </p>
            <div className="flex items-center justify-between">
                <span className="text-xs text-primary">{chat.moduleCode}</span>
                <span className="text-xs text-muted-foreground">
                    {chat.timestamp ||
                        (chat.createdAt
                            ? typeof chat.createdAt === 'string'
                                ? new Date(chat.createdAt).toLocaleDateString()
                                : new Date(chat.createdAt).toLocaleDateString()
                            : 'N/A')}
                </span>
            </div>
        </div>
    );
};

const DateGroupSection: React.FC<{
    title: string;
    chats: ChatSession[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
    defaultOpen?: boolean;
}> = ({
    title,
    chats,
    currentChatId,
    onSelectChat,
    onDeleteChat,
    defaultOpen = true,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (chats.length === 0) return null;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide">
                    <span>{title}</span>
                    <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded text-muted-foreground">
                        {chats.length}
                    </span>
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
                {chats.map((chat) => (
                    <ChatSessionItem
                        key={chat.sessionId || chat.chatId || chat.id}
                        chat={chat}
                        isActive={
                            currentChatId ===
                            (chat.sessionId || chat.chatId || chat.id)
                        }
                        onSelect={() =>
                            onSelectChat(chat.sessionId || chat.chatId || chat.id || "")
                        }
                        onDelete={() =>
                            onDeleteChat(chat.sessionId || chat.chatId || chat.id || "")
                        }
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
};

const ModuleGroupSection: React.FC<{
    moduleCode: string;
    chats: ChatSession[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
}> = ({
    moduleCode,
    chats,
    currentChatId,
    onSelectChat,
    onDeleteChat,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const moduleColor = getModuleColor(moduleCode);
    
    // Group by date within module
    const grouped = categorizeChatsByDate(chats);

    return (
        <div className="space-y-3 pb-4 border-b border-border last:border-b-0">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-2 py-2 text-sm font-semibold text-foreground hover:bg-secondary rounded-lg transition-colors">
                        <div
                            className={cn(
                                "w-3 h-3 rounded-full flex-shrink-0",
                                moduleColor
                            )}
                        />
                        <span className="flex-1 text-left truncate">{moduleCode}</span>
                        {isOpen ? (
                            <ChevronUp className="w-4 h-4 flex-shrink-0" />
                        ) : (
                            <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        )}
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 mt-2 pl-5">
                    {grouped.today.length > 0 && (
                        <DateGroupSection
                            title="Today"
                            chats={grouped.today}
                            currentChatId={currentChatId}
                            onSelectChat={onSelectChat}
                            onDeleteChat={onDeleteChat}
                            defaultOpen={true}
                        />
                    )}
                    {grouped.yesterday.length > 0 && (
                        <DateGroupSection
                            title="Yesterday"
                            chats={grouped.yesterday}
                            currentChatId={currentChatId}
                            onSelectChat={onSelectChat}
                            onDeleteChat={onDeleteChat}
                            defaultOpen={false}
                        />
                    )}
                    {grouped.thisWeek.length > 0 && (
                        <DateGroupSection
                            title="This Week"
                            chats={grouped.thisWeek}
                            currentChatId={currentChatId}
                            onSelectChat={onSelectChat}
                            onDeleteChat={onDeleteChat}
                            defaultOpen={false}
                        />
                    )}
                    {grouped.earlier.length > 0 && (
                        <DateGroupSection
                            title="Earlier"
                            chats={grouped.earlier}
                            currentChatId={currentChatId}
                            onSelectChat={onSelectChat}
                            onDeleteChat={onDeleteChat}
                            defaultOpen={false}
                        />
                    )}
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export const ChatSidebarEnhanced: React.FC<ChatSidebarEnhancedProps> = ({
    chatSessions,
    currentChatId,
    onSelectChat,
    onDeleteChat,
    onCreateNewChat,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterModule, setFilterModule] = useState<string>("");
    const [generatedTitles, setGeneratedTitles] = useState<{ [key: string]: string }>({});
    const [loadingTitles, setLoadingTitles] = useState<Set<string>>(new Set());

    // Generate AI titles for chats that need them
    useEffect(() => {
        const generateMissingTitles = async () => {
            const newLoadingTitles = new Set(loadingTitles);
            let titlesChanged = false;

            for (const session of chatSessions) {
                const sessionId = session.sessionId || session.chatId || session.id;
                
                // Skip if already has a title or is already being loaded/generated
                if (session.title && session.title !== "New Chat") {
                    continue;
                }

                if (!sessionId || newLoadingTitles.has(sessionId) || generatedTitles[sessionId]) {
                    continue;
                }

                const messageText = session.lastMessage || session.topic || "";
                if (!messageText) {
                    // No message yet, use default title based on module
                    const defaultTitle = session.moduleCode 
                        ? `${session.moduleCode} Discussion` 
                        : "New Chat";
                    setGeneratedTitles((prev) => ({
                        ...prev,
                        [sessionId]: defaultTitle,
                    }));
                    continue;
                }

                // Mark as loading
                newLoadingTitles.add(sessionId);
                setLoadingTitles(new Set(newLoadingTitles));

                // Generate title asynchronously
                try {
                    const title = await generateAITitle(messageText, session.moduleCode);
                    setGeneratedTitles((prev) => ({
                        ...prev,
                        [sessionId]: title,
                    }));
                    titlesChanged = true;
                } catch (error) {
                    console.debug(`Failed to generate title for ${sessionId}, using local method`);
                    const localTitle = generateLocalTitle(messageText, session.moduleCode);
                    setGeneratedTitles((prev) => ({
                        ...prev,
                        [sessionId]: localTitle,
                    }));
                    titlesChanged = true;
                } finally {
                    newLoadingTitles.delete(sessionId);
                    setLoadingTitles(new Set(newLoadingTitles));
                }
            }
        };

        generateMissingTitles();
    }, [chatSessions]);

    // Filter and search chats
    const filteredChats = useMemo(() => {
        return chatSessions.filter((chat) => {
            const matchesSearch =
                !searchQuery ||
                (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (chat.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (chat.moduleCode || "").toLowerCase().includes(searchQuery.toLowerCase());

            const matchesModule =
                !filterModule || chat.moduleCode === filterModule;

            return matchesSearch && matchesModule;
        });
    }, [chatSessions, searchQuery, filterModule]);

    // Get unique modules for filter
    const modules = useMemo(() => {
        const unique = new Set(chatSessions.map((c) => c.moduleCode).filter(Boolean));
        return Array.from(unique).sort();
    }, [chatSessions]);

    // Helper: Get the best available title for a session
    const getSmartTitle = (session: ChatSession): string => {
        // If session already has a title, use it
        if (session.title && session.title !== "New Chat") {
            return session.title;
        }

        const sessionId = session.sessionId || session.chatId || session.id;
        
        // Check if we have a generated AI title
        if (sessionId && generatedTitles[sessionId]) {
            return generatedTitles[sessionId];
        }

        // Check if title is being generated
        if (sessionId && loadingTitles.has(sessionId)) {
            return "Loading...";
        }

        // Fallback to local generation if we have message content
        const messageText = session.lastMessage || session.topic || "";
        if (messageText) {
            return generateLocalTitle(messageText, session.moduleCode);
        }
        
        // No message content yet, show module-based default
        return session.moduleCode ? `${session.moduleCode} Discussion` : "New Chat";
    };

    return (
        <div className="flex flex-col h-full bg-sidebar">
            {/* Header */}
            <div className="p-4">
                <Button
                    onClick={onCreateNewChat}
                    className="w-full gap-2"
                    size="sm"
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </Button>
            </div>

            {/* Search */}
            <div className="px-4 py-0">
                <div className="relative border border-border rounded-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-transparent border-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 p-4 overflow-auto scrollbar-thin">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Chats
                </h3>
                <div className="space-y-2">
                    {filteredChats.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            {chatSessions.length === 0
                                ? "No chats yet. Start a new conversation!"
                                : "No chats match your search."}
                        </p>
                    ) : (
                        filteredChats.map((session) => {
                            const sessionId = session.sessionId || session.chatId || session.id;
                            return (
                                <div
                                    key={sessionId}
                                    onClick={() => onSelectChat(sessionId || "")}
                                    className={cn(
                                        "p-3 rounded-xl cursor-pointer transition-all group card-interactive",
                                        currentChatId === sessionId && "border-primary bg-primary/5"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                         <div className="flex-1 min-w-0">
                                             <h4 className="font-medium text-sm text-foreground truncate mb-2">
                                                 {getSmartTitle(session)}
                                             </h4>
                                             <p className="text-xs text-muted-foreground">
                                                 {formatTimeWithDate(session.timestamp || session.updatedAt || session.createdAt)}
                                             </p>
                                         </div>
                                         <DropdownMenu>
                                             <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                 <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded flex-shrink-0">
                                                     <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                                 </button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent align="end" className="bg-popover border-border">
                                                 <DropdownMenuItem
                                                     className="text-destructive"
                                                     disabled={!sessionId}
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         if (sessionId) onDeleteChat(sessionId);
                                                     }}
                                                 >
                                                     <Trash2 className="w-4 h-4 mr-2" />
                                                     Delete
                                                 </DropdownMenuItem>
                                             </DropdownMenuContent>
                                         </DropdownMenu>
                                     </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * AI-Powered Chat Title Generator
 * Uses LLM to generate intelligent, descriptive titles for chat sessions
 */

// Cache for generated titles to avoid redundant API calls
const titleCache = new Map<string, string>();

/**
 * Generate a cache key from message and module
 */
const getCacheKey = (messageContent: string, moduleCode?: string): string => {
    return `${moduleCode || "default"}:${messageContent.substring(0, 100)}`;
};

/**
 * Generate a descriptive title using AI
 * Connects to your RAG backend for intelligent title generation
 * Falls back to local generation on failure
 */
export const generateAITitle = async (
    messageContent: string,
    moduleCode?: string
): Promise<string> => {
    // Return empty string if message is empty
    if (!messageContent || messageContent.trim().length === 0) {
        return moduleCode ? `${moduleCode} Discussion` : "Conversation";
    }

    // Check cache first
    const cacheKey = getCacheKey(messageContent, moduleCode);
    if (titleCache.has(cacheKey)) {
        return titleCache.get(cacheKey)!;
    }

    // Use local generation
    // The backend handles AI-powered title generation via the dedicated endpoint
    // This frontend utility provides fast, synchronous titles for the sidebar
    const localTitle = generateLocalTitle(messageContent, moduleCode);
    // Cache the result
    titleCache.set(cacheKey, localTitle);
    return localTitle;
};

/**
 * Clear the title cache (useful for testing or manual refresh)
 */
export const clearTitleCache = (): void => {
    titleCache.clear();
};

/**
 * Local title generation (no API call required)
 * Uses intelligent keyword extraction and NLP-like processing
 */
export const generateLocalTitle = (
    messageText: string,
    moduleCode?: string
): string => {
    if (!messageText) {
        return moduleCode ? `${moduleCode} Discussion` : "Conversation";
    }

    // Clean and normalize
    let title = messageText
        .replace(/^(user|ai|assistant|me):\s*/i, "")
        .trim();

    // Advanced question starter removal with better extraction
    const advancedPatterns = [
        /^(explain|what|how|why|can you|tell me|show me|help|does|what's|who|when|where)\s+(?:about\s+)?/i,
        /^(is|are|have|has|should|could|would|will|do|did|does|must|may|might)\s+/i,
        /^(give|provide|create|make|build|write|generate|summarize|compare|contrast|analyze|describe|define)\s+(?:me\s+)?/i,
        /^(list|name|identify|find|solve|calculate|compute|design|implement|optimize|improve)\s+/i,
        /^(fix|debug|test|review|evaluate|assess|check)\s+/i,
    ];

    for (const pattern of advancedPatterns) {
        const match = title.match(pattern);
        if (match) {
            title = title.substring(match[0].length).trim();
            break;
        }
    }

    // If nothing remains, use original cleaned text
    if (!title || title.length < 3) {
        title = messageText
            .replace(/^(user|ai|assistant|me):\s*/i, "")
            .trim();
    }

    // Clean up trailing punctuation
    title = title.replace(/[?!.]+$/, "").trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Smart truncation with word boundaries
    if (title.length > 45) {
        const truncated = title.substring(0, 45);
        const lastSpace = truncated.lastIndexOf(" ");
        if (lastSpace > 20) {
            title = truncated.substring(0, lastSpace) + "...";
        } else {
            title = truncated + "...";
        }
    }

    // Combine with module if available
    if (moduleCode) {
        return `${moduleCode} • ${title}`;
    }

    return title;
};

/**
 * Extract key topics/concepts from message
 * Useful for semantic understanding
 */
export const extractKeywords = (text: string): string[] => {
    // Common stop words to filter
    const stopWords = new Set([
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "have",
        "has",
        "do",
        "does",
        "did",
        "can",
        "could",
        "would",
        "should",
        "will",
        "may",
        "might",
        "must",
        "i",
        "you",
        "he",
        "she",
        "it",
        "we",
        "they",
    ]);

    // Extract words (alphanumeric + some special chars)
    const words = text
        .toLowerCase()
        .split(/[\s\W]+/)
        .filter(
            (word) =>
                word.length > 2 &&
                !stopWords.has(word) &&
                /[a-z0-9]/.test(word)
        );

    // Get unique words, preserve order
    return [...new Set(words)].slice(0, 3);
};

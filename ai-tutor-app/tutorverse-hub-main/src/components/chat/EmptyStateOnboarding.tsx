import React from "react";
import { MessageSquare, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateOnboardingProps {
    hasContext: boolean;
    onBrowseContent?: () => void;
    onSuggestedPrompt?: (prompt: string) => void;
}

const suggestedPrompts = [
    {
        icon: "💡",
        text: "Explain this concept in simple terms",
        description: "Break down complex topics",
    },
    {
        icon: "💬",
        text: "Give me a code example",
        description: "Learn through examples",
    },
    {
        icon: "🎓",
        text: "Quiz me on this topic",
        description: "Test your knowledge",
    },
    {
        icon: "📝",
        text: "Create a summary",
        description: "Key points overview",
    },
];

const tips = [
    "Be specific with your questions",
    "Ask for examples and code",
    "Request specific formats (quiz, summary)",
];

export const EmptyStateOnboarding: React.FC<EmptyStateOnboardingProps> = ({
    hasContext,
    onBrowseContent,
    onSuggestedPrompt,
}) => {
    if (hasContext) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    Ready to learn
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                    Ask your first question about the selected content
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
            <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
                Select a module to get started
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Choose a module from the dropdown above to provide context
            </p>
            <Button onClick={onBrowseContent} variant="outline" size="sm" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Browse Modules
            </Button>
        </div>
    );
};

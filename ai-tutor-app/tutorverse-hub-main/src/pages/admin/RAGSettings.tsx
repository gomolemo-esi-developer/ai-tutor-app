import React, { useState, useEffect, useCallback } from "react";
import {
    AlertCircle,
    Zap,
    Volume2,
    Search,
    HardDrive,
    MessageSquare,
    Settings,
    Check,
    X,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RAGSettingsService, RAGSettings } from "@/services/RAGSettingsService";

/**
 * RAG Settings Administration Page
 *
 * Allows admins to configure:
 * - LLM Model selection
 * - Temperature (creativity control)
 * - Embedding model
 * - Retrieval settings (top-k)
 * - Custom prompts
 * - Offline mode (LM Studio)
 */

const RAGSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // State
    const [settings, setSettings] = useState<RAGSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Local editing state
    const [editedValues, setEditedValues] = useState<Partial<RAGSettings>>({});

    // Redirect non-admins
    useEffect(() => {
        if (user && !user.role?.toUpperCase().includes("ADMIN")) {
            window.location.href = "/modules";
        }
    }, [user]);

    // Fetch settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await RAGSettingsService.getRAGSettings();
            setSettings(data);
            setEditedValues(data);
        } catch (err: any) {
            const errorMsg = err.message || "Failed to load RAG settings";
            setError(errorMsg);
            toast({
                title: "Error",
                description: errorMsg,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const handleSaveModel = async (modelId: string) => {
        try {
            setIsSaving("model");
            await RAGSettingsService.updateModel(modelId);
            setSettings((prev) => (prev ? { ...prev, llm_model: modelId } : null));
            toast({
                title: "Success",
                description: "LLM model updated successfully",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Failed to update model",
                variant: "destructive",
            });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSaveTemperature = async (temperature: number) => {
        try {
            setIsSaving("temperature");
            await RAGSettingsService.updateTemperature(temperature);
            setSettings((prev) => (prev ? { ...prev, temperature } : null));
            toast({
                title: "Success",
                description: "Temperature updated successfully",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Failed to update temperature",
                variant: "destructive",
            });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSaveRetrieval = async (topK: number) => {
        try {
            setIsSaving("retrieval");
            await RAGSettingsService.updateRetrieval(topK);
            setSettings((prev) => (prev ? { ...prev, retrieval_top_k: topK } : null));
            toast({
                title: "Success",
                description: "Retrieval settings updated successfully",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Failed to update retrieval settings",
                variant: "destructive",
            });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSavePrompts = async () => {
        try {
            setIsSaving("prompts");
            await RAGSettingsService.updatePrompts(
                editedValues.custom_prompt,
                editedValues.quiz_prompt
            );
            setSettings((prev) =>
                prev
                    ? {
                        ...prev,
                        custom_prompt: editedValues.custom_prompt || "",
                        quiz_prompt: editedValues.quiz_prompt || "",
                    }
                    : null
            );
            toast({
                title: "Success",
                description: "Prompts updated successfully",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Failed to update prompts",
                variant: "destructive",
            });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSaveOfflineMode = async () => {
        try {
            setIsSaving("offline");
            await RAGSettingsService.updateOfflineMode(
                editedValues.offline_mode ?? false,
                editedValues.lm_studio_url,
                editedValues.lm_studio_model
            );
            setSettings((prev) =>
                prev
                    ? {
                        ...prev,
                        offline_mode: editedValues.offline_mode ?? prev.offline_mode,
                        lm_studio_url: editedValues.lm_studio_url || prev.lm_studio_url,
                        lm_studio_model: editedValues.lm_studio_model || prev.lm_studio_model,
                    }
                    : null
            );
            toast({
                title: "Success",
                description: "Offline mode settings updated successfully",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Failed to update offline mode",
                variant: "destructive",
            });
        } finally {
            setIsSaving(null);
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <LoadingSpinner />
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout>
                <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h2 className="text-lg font-semibold text-red-900 mb-2">
                                    Error Loading RAG Settings
                                </h2>
                                <p className="text-red-700 mb-4">{error}</p>
                                <Button
                                    onClick={loadSettings}
                                    variant="outline"
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!settings) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <LoadingSpinner />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <header className="mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                            RAG Settings
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Configure the Retrieval-Augmented Generation system settings
                        </p>
                    </header>

                    {/* LLM Model Selection */}
                    <div className="bg-card rounded-lg border border-border p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap className="w-5 h-5 text-amber-600" />
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                LLM Model Selection
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Current Model: <span className="font-medium">{settings.llm_model}</span>
                            </p>

                            <Select
                                value={editedValues.llm_model || settings.llm_model}
                                onValueChange={(value) =>
                                    setEditedValues((prev) => ({
                                        ...prev,
                                        llm_model: value,
                                    }))
                                }
                                disabled={isSaving === "model"}
                            >
                                <SelectTrigger className="border-input">
                                    <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    {settings.available_models.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name} - {model.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                onClick={() =>
                                    handleSaveModel(editedValues.llm_model || settings.llm_model)
                                }
                                disabled={isSaving === "model"}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {isSaving === "model" ? (
                                    <>
                                        <span className="mr-2">Saving...</span>
                                        <LoadingSpinner />
                                    </>
                                ) : (
                                    "Save Model"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Temperature Control */}
                    <div className="bg-card rounded-lg border border-border p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Volume2 className="w-5 h-5 text-orange-600" />
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                Temperature (Creativity)
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600">Current: {editedValues.temperature ?? settings.temperature}</span>
                                    <span className="text-xs text-gray-500">Range: 0.0 - 2.0</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={editedValues.temperature ?? settings.temperature}
                                    onChange={(e) =>
                                        setEditedValues((prev) => ({
                                            ...prev,
                                            temperature: parseFloat(e.target.value),
                                        }))
                                    }
                                    disabled={isSaving === "temperature"}
                                    className="w-full h-2 bg-gradient-to-r from-blue-400 to-orange-400 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                    <span className="font-medium">Lower (0.0):</span>
                                    <p>Predictable, focused responses</p>
                                </div>
                                <div>
                                    <span className="font-medium">Higher (2.0):</span>
                                    <p>Creative, varied responses</p>
                                </div>
                            </div>

                            <Button
                                onClick={() =>
                                    handleSaveTemperature(editedValues.temperature ?? settings.temperature)
                                }
                                disabled={isSaving === "temperature"}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                                {isSaving === "temperature" ? (
                                    <>
                                        <span className="mr-2">Saving...</span>
                                        <LoadingSpinner />
                                    </>
                                ) : (
                                    "Save Temperature"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Embedding Model */}
                    <div className="bg-card rounded-lg border border-border p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Search className="w-5 h-5 text-foreground" />
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                Embedding Model
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <span className="font-medium">⚠️ Warning:</span> Changing the
                                    embedding model requires re-vectorizing all uploaded documents.
                                    Only change if you understand the impact.
                                </p>
                            </div>

                            <p className="text-sm text-gray-600">
                                Current: <span className="font-medium">{settings.embedding_model}</span>
                            </p>
                        </div>
                    </div>

                    {/* Retrieval Settings */}
                    <div className="bg-card rounded-lg border border-border p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <HardDrive className="w-5 h-5 text-foreground" />
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                Retrieval Settings
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Top-K Documents
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    How many document chunks to retrieve for context
                                </p>
                                <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={editedValues.retrieval_top_k ?? settings.retrieval_top_k}
                                    onChange={(e) =>
                                        setEditedValues((prev) => ({
                                            ...prev,
                                            retrieval_top_k: parseInt(e.target.value, 10),
                                        }))
                                    }
                                    disabled={isSaving === "retrieval"}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Valid range: 5 - 100 (higher = more context but slower)
                                </p>
                            </div>

                            <Button
                                onClick={() =>
                                    handleSaveRetrieval(editedValues.retrieval_top_k ?? settings.retrieval_top_k)
                                }
                                disabled={isSaving === "retrieval"}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                {isSaving === "retrieval" ? (
                                    <>
                                        <span className="mr-2">Saving...</span>
                                        <LoadingSpinner />
                                    </>
                                ) : (
                                    "Save Retrieval Settings"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Custom Prompts */}
                    <div className="bg-card rounded-lg border border-border p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquare className="w-5 h-5 text-foreground" />
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                Custom Prompts
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {/* System Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    System Prompt
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Prepended to all chat requests. Leave empty to use default.
                                </p>
                                <textarea
                                    value={editedValues.custom_prompt ?? settings.custom_prompt}
                                    onChange={(e) =>
                                        setEditedValues((prev) => ({
                                            ...prev,
                                            custom_prompt: e.target.value,
                                        }))
                                    }
                                    disabled={isSaving === "prompts"}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                                    placeholder="You are a comprehensive AI tutor..."
                                />
                            </div>

                            {/* Quiz Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quiz Generation Prompt
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Controls how quiz questions are generated. Leave empty to use
                                    default.
                                </p>
                                <textarea
                                    value={editedValues.quiz_prompt ?? settings.quiz_prompt}
                                    onChange={(e) =>
                                        setEditedValues((prev) => ({
                                            ...prev,
                                            quiz_prompt: e.target.value,
                                        }))
                                    }
                                    disabled={isSaving === "prompts"}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                                    placeholder="Generate quiz questions about..."
                                />
                            </div>

                            <Button
                                onClick={handleSavePrompts}
                                disabled={isSaving === "prompts"}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isSaving === "prompts" ? (
                                    <>
                                        <span className="mr-2">Saving...</span>
                                        <LoadingSpinner />
                                    </>
                                ) : (
                                    "Save Prompts"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Offline Mode */}
                    <div className="bg-card rounded-lg border border-border p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                Offline Mode (LM Studio)
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editedValues.offline_mode ?? settings.offline_mode}
                                    onChange={(e) =>
                                        setEditedValues((prev) => ({
                                            ...prev,
                                            offline_mode: e.target.checked,
                                        }))
                                    }
                                    disabled={isSaving === "offline"}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <span className="text-gray-700 font-medium">
                                    Enable Offline Mode
                                </span>
                            </label>

                            {editedValues.offline_mode ?? settings.offline_mode ? (
                                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            LM Studio URL
                                        </label>
                                        <input
                                            type="text"
                                            value={editedValues.lm_studio_url ?? settings.lm_studio_url}
                                            onChange={(e) =>
                                                setEditedValues((prev) => ({
                                                    ...prev,
                                                    lm_studio_url: e.target.value,
                                                }))
                                            }
                                            disabled={isSaving === "offline"}
                                            placeholder="http://192.168.0.134:1234/v1"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            LM Studio Model
                                        </label>
                                        <input
                                            type="text"
                                            value={editedValues.lm_studio_model ?? settings.lm_studio_model}
                                            onChange={(e) =>
                                                setEditedValues((prev) => ({
                                                    ...prev,
                                                    lm_studio_model: e.target.value,
                                                }))
                                            }
                                            disabled={isSaving === "offline"}
                                            placeholder="openai/gpt-oss-20b"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <Button
                                onClick={handleSaveOfflineMode}
                                disabled={isSaving === "offline"}
                                className="w-full bg-red-600 hover:bg-red-700"
                            >
                                {isSaving === "offline" ? (
                                    <>
                                        <span className="mr-2">Saving...</span>
                                        <LoadingSpinner />
                                    </>
                                ) : (
                                    "Save Offline Mode"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Settings are applied immediately</p>
                            <p>
                                Changes take effect for new requests. Ongoing conversations will
                                use the settings at the time they were initiated.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default RAGSettingsPage;

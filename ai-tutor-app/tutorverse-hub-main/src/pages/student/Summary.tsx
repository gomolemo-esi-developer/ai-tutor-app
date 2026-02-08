import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, BookOpen, Lightbulb, List, Target } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useContentSelection } from '@/contexts/ContentSelectionContext';
import SelectedContentBar from '@/components/content/SelectedContentBar';
import { AIMessageRenderer } from '@/components/AIMessageRenderer';
import { ContentItem } from '@/types';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import PDFDownloadButton from '@/components/pdf/PDFDownloadButton';
import { getTimestampForFilename } from '@/utils/pdf-export';

interface SummaryData {
    overview: string;
    keyPoints: string[];
    learningObjectives: string[];
    estimatedReadTime: string;
    difficulty: string;
    topics: string[];
}

const calculateReadTime = (contentItems: ContentItem[]): string => {
    // Calculate total character count from selected content items
    const totalCharacters = contentItems.reduce((sum, item) => {
        // Count characters from title and description/content
        const titleChars = item.title?.length || 0;
        const contentChars = (item.description || item.content || '')?.length || 0;
        return sum + titleChars + contentChars;
    }, 0);

    // Map character count to read time ranges (based on 1200 chars/min)
    if (totalCharacters < 5880) return '< 5 minutes';
    if (totalCharacters < 12000) return '5–10 minutes';
    if (totalCharacters < 18000) return '10–15 minutes';
    if (totalCharacters < 24000) return '15–20 minutes';
    if (totalCharacters < 36000) return '20–30 minutes';
    return '30+ minutes';
};

const extractTopicsFromContent = (contentItems: ContentItem[]): string[] => {
    // Extract unique topics/tags from selected content items
    const topics = new Set<string>();
    
    contentItems.forEach(item => {
        // Add category if available
        if ((item as any).category) {
            topics.add((item as any).category);
        }
        // Add tags if available
        if ((item as any).tags && Array.isArray((item as any).tags)) {
            (item as any).tags.forEach((tag: string) => topics.add(tag));
        }
        // Add content type as a topic
        if (item.contentType) {
            topics.add(item.contentType);
        }
    });

    return Array.from(topics).length > 0 
        ? Array.from(topics) 
        : ['Content', 'Learning', 'Material'];
};

const parseSummaryContent = (summaryText: string, contentItems: ContentItem[] = []): SummaryData => {
    // Parse AI-generated summary into structured data
    // This fallback ensures we have structured data even if API returns plain text
    return {
        overview: summaryText,
        keyPoints: [
            'Understanding the core principles and theoretical framework',
            'Practical implementation strategies and methodologies',
            'Common challenges and effective solutions',
            'Industry best practices and standards',
            'Future trends and emerging technologies',
        ],
        learningObjectives: [
            'Demonstrate understanding of fundamental concepts',
            'Apply theoretical knowledge to practical scenarios',
            'Analyze and solve complex problems',
            'Evaluate different approaches and solutions',
        ],
        estimatedReadTime: calculateReadTime(contentItems),
        difficulty: 'Intermediate',
        topics: extractTopicsFromContent(contentItems),
    };
};

const Summary: React.FC = () => {
    const { moduleCode } = useParams<{ moduleCode: string }>();
    const [searchParams] = useSearchParams();
    const contentIdsParam = searchParams.get('contentIds');
    const contentIdParam = searchParams.get('contentId');
    const navigate = useNavigate();
    const { selectedContent, setSelectedContent } = useContentSelection();
    const [isLoading, setIsLoading] = useState(true);
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const { post: postSummary } = useApi();

    useEffect(() => {
        // Get content from URL params or context
        let items: ContentItem[] = [];

        if (contentIdsParam) {
            // Multiple content IDs from URL
            const ids = contentIdsParam.split(',').filter(Boolean);
            items = ids.map(id => {
                // Try to find from selectedContent context
                return selectedContent.find(c => (c as any).id === id);
            }).filter(Boolean) as ContentItem[];
            // Sync to context so SelectedContentBar shows them
            if (items.length > 0) {
                setSelectedContent(items);
            }
        } else if (contentIdParam) {
            // Single content ID from URL (legacy support)
            const item = selectedContent.find(c => (c as any).id === contentIdParam);
            if (item) {
                items = [item];
                setSelectedContent(items);
            }
        } else if (selectedContent.length > 0) {
            // From context
            items = selectedContent;
        }

        setContentItems(items);

        // Generate summary if we have content
        if (items.length > 0 && moduleCode) {
            generateSummary(items);
        } else {
            setIsLoading(false);
        }
    }, [contentIdsParam, contentIdParam, moduleCode]);

    const generateSummary = async (items: ContentItem[]) => {
        try {
            setIsLoading(true);
            const response = await postSummary('/api/summary/generate', {
                moduleId: moduleCode,
                contentIds: items.map(c => (c as any).id),
                maxLength: 500,
            });

            // Response structure: { success: true, data: { summary, ... }, message }
            const summaryData = (response as any)?.summary || (response as any)?.data?.summary;

            if (summaryData) {
                setSummary(parseSummaryContent(summaryData, items));
            } else {
                // Fallback to parsed default
                setSummary(parseSummaryContent('Summary generated from selected content.', items));
            }
        } catch (err) {
            console.error('Failed to generate summary:', err);
            toast.error('Failed to generate summary, using default structure');
            // Provide default structure on error
            setSummary(parseSummaryContent('Unable to generate summary at this time. Please try again later.', items));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner message="AI Tutor is generating summary..." />
                </div>
            </MainLayout>
        );
    }

    if (contentItems.length === 0 || !summary) {
        return (
            <MainLayout>
                <div className="flex-1 flex items-center justify-center flex-col gap-4">
                    <p className="text-muted-foreground">No content selected for summary</p>
                    <Button onClick={() => navigate(`/modules/${moduleCode}`)}>
                        Go Back to Module
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
                <div className="max-w-3xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <Button
                            variant="ghost"
                            className="w-full sm:w-auto"
                            onClick={() => navigate(`/modules/${moduleCode}`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Content
                        </Button>
                        <PDFDownloadButton
                            elementId="summary-content"
                            filename={`Summary-${contentItems.length > 1 ? 'Multiple' : contentItems[0]?.title || 'Content'}-${getTimestampForFilename()}.pdf`}
                            title={contentItems.length === 1 ? contentItems[0].title : `Summary of ${contentItems.length} Items`}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <SelectedContentBar showClear={false} className="mb-4" />

                    <div id="summary-content" className="print:block">
                        <header className="mb-6 md:mb-8">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                            <FileText className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                            <span className="text-xs md:text-sm font-medium text-warning bg-warning/10 px-3 py-1 rounded-full">
                                AI Summary
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {contentItems.length} item{contentItems.length > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                            {contentItems.length === 1 ? contentItems[0].title : `Summary of ${contentItems.length} Items`}
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">
                            {moduleCode}
                        </p>
                        {contentItems.length > 1 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {contentItems.map((item) => (
                                    <span key={(item as any).id} className="text-xs bg-secondary px-2 py-1 rounded-full">
                                        {item.title}
                                    </span>
                                ))}
                            </div>
                        )}
                    </header>

                    <div className="grid gap-4 md:gap-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <Card className="bg-card border-border card-elevated">
                                <CardContent className="p-3 md:p-4 flex items-center gap-3">
                                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Read Time</p>
                                        <p className="text-sm md:text-base font-medium">{summary.estimatedReadTime}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border card-elevated">
                                <CardContent className="p-3 md:p-4 flex items-center gap-3">
                                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Topics</p>
                                        <p className="text-sm md:text-base font-medium">{summary.topics.length} covered</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Overview */}
                         <Card className="bg-card border-border card-elevated">
                             <CardHeader className="pb-3 p-4 md:p-6 md:pb-3">
                                 <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                     <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                     AI Summary
                                 </CardTitle>
                             </CardHeader>
                             <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                                 <AIMessageRenderer content={summary.overview} />
                             </CardContent>
                         </Card>

                        {/* Key Points - TODO: Use later */}
                        {/* 
                         <Card className="bg-card border-border card-elevated">
                              <CardHeader className="pb-3 p-4 md:p-6 md:pb-3">
                                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                      <List className="w-4 h-4 md:w-5 md:h-5 text-success" />
                                      Key Points
                                  </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                                  <ul className="space-y-3 md:space-y-4">
                                      {summary.keyPoints.map((point, idx) => (
                                          <li key={idx} className="flex items-start gap-4">
                                              <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full bg-success/20 text-success text-xs md:text-sm flex items-center justify-center font-bold">
                                                  {idx + 1}
                                              </span>
                                              <span className="text-sm md:text-base text-foreground leading-7 font-medium">{point}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </CardContent>
                          </Card>
                        */}

                        {/* Learning Objectives - TODO: Use later */}
                        {/* 
                         <Card className="bg-card border-border card-elevated">
                              <CardHeader className="pb-3 p-4 md:p-6 md:pb-3">
                                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                      <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                                      Learning Objectives
                                  </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                                  <ul className="space-y-3 md:space-y-4">
                                      {summary.learningObjectives.map((objective, idx) => (
                                          <li key={idx} className="flex items-start gap-4">
                                              <span className="flex-shrink-0 mt-2.5">
                                                  <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                                              </span>
                                              <span className="text-sm md:text-base text-foreground leading-7 font-medium">{objective}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </CardContent>
                          </Card>
                        */}

                        {/* Topics */}
                        <Card className="bg-card border-border card-elevated">
                            <CardHeader className="pb-3 p-4 md:p-6 md:pb-3">
                                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                    Topics Covered
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                                <div className="flex flex-wrap gap-2">
                                    {summary.topics.map((topic, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 rounded-full bg-secondary text-xs md:text-sm font-medium text-foreground"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Separator className="my-2" />

                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => {
                                        const ids = contentItems.map(c => (c as any).id).join(',');
                                        navigate(`/modules/${moduleCode}/quiz?contentIds=${ids}`);
                                    }}
                                >
                                    Take Quiz
                                </Button>
                                <Button
                                    className="w-full sm:w-auto"
                                    onClick={() => {
                                        const ids = contentItems.map(c => (c as any).id).join(',');
                                        navigate(`/chat?moduleId=${moduleCode}&contentIds=${ids}`);
                                    }}
                                >
                                    Ask AI Questions
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default Summary;

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, FileText } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import SelectedContentBar from "@/components/content/SelectedContentBar";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useContentSelection } from "@/contexts/ContentSelectionContext";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

interface Question {
  questionId: string;
  type: "single-select" | "multi-select" | "fill-blank" | "true-false";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points?: number;
}

const generateMockQuestions = (contentTitle: string): Question[] => [
  {
    questionId: "1",
    type: "single-select",
    question: `What is the primary focus of "${contentTitle}"?`,
    options: [
      "Understanding core concepts and fundamentals",
      "Advanced optimization techniques",
      "Historical context and evolution",
      "Practical implementation strategies",
    ],
    correctAnswer: "Understanding core concepts and fundamentals",
  },
  {
    questionId: "2",
    type: "true-false",
    question: "The material covers both theoretical and practical aspects.",
    options: ["True", "False"],
    correctAnswer: "True",
  },
  {
    questionId: "3",
    type: "fill-blank",
    question: "The recommended approach mentioned is called ____ methodology.",
    correctAnswer: "hybrid",
  },
  {
    questionId: "4",
    type: "single-select",
    question:
      "Which of the following best describes the key principle discussed?",
    options: [
      "Sequential processing methodology",
      "Parallel computation approach",
      "Iterative development cycle",
      "Modular design pattern",
    ],
    correctAnswer: "Modular design pattern",
  },
  {
    questionId: "5",
    type: "true-false",
    question: "Resource allocation is mentioned as a common challenge.",
    options: ["True", "False"],
    correctAnswer: "True",
  },
  {
    questionId: "6",
    type: "single-select",
    question: "According to the content, what is the recommended approach?",
    options: [
      "Top-down analysis",
      "Bottom-up synthesis",
      "Hybrid methodology",
      "Agile iteration",
    ],
    correctAnswer: "Hybrid methodology",
  },
  {
    questionId: "7",
    type: "fill-blank",
    question: "Data-driven ____ making is highlighted as most effective.",
    correctAnswer: "decision",
  },
  {
    questionId: "8",
    type: "true-false",
    question: "The content suggests avoiding documentation during development.",
    options: ["True", "False"],
    correctAnswer: "False",
  },
  {
    questionId: "9",
    type: "single-select",
    question: "What is a common challenge mentioned in this material?",
    options: [
      "Resource allocation only",
      "Time management only",
      "Technical complexity only",
      "All of the above",
    ],
    correctAnswer: "All of the above",
  },
  {
    questionId: "10",
    type: "fill-blank",
    question: "The content emphasizes the importance of ____ brainstorming.",
    correctAnswer: "collaborative",
  },
  {
    questionId: "11",
    type: "single-select",
    question: "Which technique is highlighted as most effective?",
    options: [
      "Data-driven decision making",
      "Intuitive problem solving",
      "Random experimentation",
      "Isolated development",
    ],
    correctAnswer: "Data-driven decision making",
  },
  {
    questionId: "12",
    type: "true-false",
    question: "Systematic documentation is discouraged in the material.",
    options: ["True", "False"],
    correctAnswer: "False",
  },
  {
    questionId: "13",
    type: "single-select",
    question: "What approach does the material recommend for complex problems?",
    options: [
      "Ignore edge cases",
      "Break down into smaller components",
      "Avoid testing",
      "Work in isolation",
    ],
    correctAnswer: "Break down into smaller components",
  },
  {
    questionId: "14",
    type: "fill-blank",
    question: "The material recommends an ____ development cycle.",
    correctAnswer: "iterative",
  },
  {
    questionId: "15",
    type: "true-false",
    question: "Collaboration is emphasized throughout the content.",
    options: ["True", "False"],
    correctAnswer: "True",
  },
];

const Quiz: React.FC = () => {
  const { moduleCode } = useParams<{ moduleCode: string }>();
  const [searchParams] = useSearchParams();
  const contentIds = searchParams.get("contentIds");
  const navigate = useNavigate();
  const { selectedContent } = useContentSelection();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);

  const { post: postQuiz, loading } = useApi<Question[]>();

  const contentItems = contentIds
    ? contentIds
        .split(",")
        .map((id) => selectedContent.find((c: any) => c.id === id))
        .filter(Boolean)
    : selectedContent;

  const primaryContent = contentItems[0];

  useEffect(() => {
    if (contentIds || selectedContent.length > 0) {
      fetchQuestions();
    } else {
      // Fallback to mock questions if no content provided
      setQuestions(
        generateMockQuestions(primaryContent?.title || "Selected Content")
      );
    }
  }, [contentIds, selectedContent]);

  const fetchQuestions = async () => {
    try {
      const response = await postQuiz("/api/quiz/generate", {
        moduleId: moduleCode,
        contentIds:
          contentIds?.split(",") || selectedContent.map((c) => (c as any).id),
        numQuestions: 20,
        difficulty: "MEDIUM",
      }, { timeout: 60000 });
      // Response structure: { success: true, data: { quizId, questions, ... }, message }
      const quizData = response as any;
      const questions = quizData?.questions || [];
      setQuestions(
        questions.length > 0
          ? questions
          : generateMockQuestions(primaryContent?.title || "Selected Content")
      );
    } catch (err) {
      // Fall back to mock data if API fails
      console.error("Failed to generate quiz:", err);
      toast.error("Failed to generate quiz, using sample questions");
      setQuestions(
        generateMockQuestions(primaryContent?.title || "Selected Content")
      );
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    try {
      const results = questions.map((q) => ({
        questionId: q.questionId,
        userAnswer: answers[q.questionId] || "",
      }));

      // Submit to API
      const response = await postQuiz("/api/quiz/submit", {
        answers: results,
        moduleCode,
      });

      sessionStorage.setItem(
        "quizResults",
        JSON.stringify(
          response ||
            questions.map((q) => ({
              ...q,
              userAnswer: answers[q.questionId] || "",
              isCorrect: answers[q.questionId]
                ? (answers[q.questionId] || "").toLowerCase().trim() ===
                  (typeof q.correctAnswer === "string" ? q.correctAnswer : q.correctAnswer[0]).toLowerCase().trim()
                : false,
              wasAnswered: !!answers[q.questionId],
            }))
        )
      );
      sessionStorage.setItem("quizModuleCode", moduleCode || "");
      sessionStorage.setItem("quizContentIds", contentIds || "");
      navigate(`/modules/${moduleCode}/quiz-results?contentIds=${contentIds}`);
    } catch (err) {
      // Fall back to local evaluation
      const results = questions.map((q) => ({
        ...q,
        userAnswer: answers[q.questionId] || "",
        isCorrect: answers[q.questionId]
          ? (answers[q.questionId] || "").toLowerCase().trim() ===
            (typeof q.correctAnswer === "string" ? q.correctAnswer : q.correctAnswer[0]).toLowerCase().trim()
          : false,
        wasAnswered: !!answers[q.questionId],
      }));

      sessionStorage.setItem("quizResults", JSON.stringify(results));
      sessionStorage.setItem("quizModuleCode", moduleCode || "");
      sessionStorage.setItem("quizContentIds", contentIds || "");
      navigate(`/modules/${moduleCode}/quiz-results?contentIds=${contentIds}`);
    }
  }

  if (loading || questions.length === 0) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Generating your quiz..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/modules/${moduleCode}`)}
              className="text-muted-foreground hover:text-foreground self-start"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <span className="text-xs md:text-sm font-medium text-primary bg-primary/10 px-2 md:px-3 py-1 rounded-full">
                  Quiz Mode
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                 {primaryContent?.title || "Quiz"}
               </h1>
               <p className="text-muted-foreground text-xs md:text-sm">
                 {moduleCode} • Answer the questions below
               </p>
            </div>
            <div className="flex items-center gap-2 text-sm self-start sm:self-auto">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs md:text-sm">
                {answeredCount}/{totalQuestions} answered
              </span>
            </div>
          </div>

          {/* Selected Content Display */}
          {contentItems.length > 0 && <SelectedContentBar showClear={false} />}

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-6 md:mb-8">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>

          {/* All Questions */}
          <div className="space-y-4 md:space-y-6">
            {questions.map((question, index) => (
              <Card
                key={question.questionId}
                className="p-4 md:p-6 bg-card border-border"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs md:text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 md:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 md:gap-4">
                      <p className="text-sm md:text-base text-foreground font-medium">
                        {question.question}
                      </p>
                      <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground self-start">
                        {question.type === "single-select" &&
                          "Multiple Choice"}
                        {question.type === "multi-select" && "Multi-Select"}
                        {question.type === "true-false" && "True/False"}
                        {question.type === "fill-blank" && "Fill in the Blank"}
                      </span>
                    </div>

                    {/* Single-Select / True-False (Radio buttons) */}
                    {(question.type === "single-select" ||
                      question.type === "true-false") && (
                      <RadioGroup
                        value={answers[question.questionId] || ""}
                        onValueChange={(value) =>
                          handleAnswerChange(question.questionId, value)
                        }
                        className="space-y-2"
                      >
                        {question.options?.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`flex items-center space-x-3 p-2.5 md:p-3 rounded-lg border transition-all cursor-pointer ${
                              answers[question.questionId] === option
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            }`}
                          >
                            <RadioGroupItem
                              value={option}
                              id={`q${question.questionId}-opt${optIndex}`}
                            />
                            <Label
                              htmlFor={`q${question.questionId}-opt${optIndex}`}
                              className="flex-1 cursor-pointer text-foreground text-sm md:text-base"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {/* Multi-Select (Checkboxes) */}
                    {question.type === "multi-select" && (
                      <div className="space-y-2">
                        {question.options?.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`flex items-center space-x-3 p-2.5 md:p-3 rounded-lg border transition-all cursor-pointer ${
                              (answers[question.questionId] || "")
                                .split(",")
                                .includes(option)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`q${question.questionId}-opt${optIndex}`}
                              checked={(
                                answers[question.questionId] || ""
                              )
                                .split(",")
                                .includes(option)}
                              onChange={(e) => {
                                const currentAnswers = (
                                  answers[question.questionId] || ""
                                )
                                  .split(",")
                                  .filter((a) => a);
                                if (e.target.checked) {
                                  currentAnswers.push(option);
                                } else {
                                  currentAnswers.splice(
                                    currentAnswers.indexOf(option),
                                    1
                                  );
                                }
                                handleAnswerChange(
                                  question.questionId,
                                  currentAnswers.join(",")
                                );
                              }}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                            <Label
                              htmlFor={`q${question.questionId}-opt${optIndex}`}
                              className="flex-1 cursor-pointer text-foreground text-sm md:text-base"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fill in the Blank */}
                    {question.type === "fill-blank" && (
                      <Input
                        placeholder="Type your answer..."
                        value={answers[question.questionId] || ""}
                        onChange={(e) =>
                          handleAnswerChange(question.questionId, e.target.value)
                        }
                        className="max-w-md bg-background border-border"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-6 md:mt-8 flex flex-col items-center gap-2">
            <Button
              size="lg"
              onClick={handleSubmit}
              className="w-full sm:w-auto px-12 gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Submit Quiz
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You can submit without answering all questions
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Quiz;

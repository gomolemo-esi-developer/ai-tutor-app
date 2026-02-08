import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PDFDownloadButton from '@/components/pdf/PDFDownloadButton';
import { getTimestampForFilename } from '@/utils/pdf-export';

interface QuizResult {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

const QuizResults: React.FC = () => {
  const { moduleCode } = useParams<{ moduleCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contentId = searchParams.get('contentId');

  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    const storedResults = sessionStorage.getItem('quizResults');
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    } else {
      navigate(`/modules/${moduleCode}/quiz?contentId=${contentId}`);
    }
  }, [moduleCode, contentId, navigate]);

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalQuestions = results.length;
  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreMessage = () => {
    if (percentage >= 80) return 'Excellent work!';
    if (percentage >= 60) return 'Good effort! Keep practicing.';
    return 'Keep studying, you will improve!';
  };

  const handleRetakeQuiz = () => {
    sessionStorage.removeItem('quizResults');
    navigate(`/modules/${moduleCode}/quiz?contentId=${contentId}`);
  };

  if (results.length === 0) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/modules/${moduleCode}`)}
              className="text-muted-foreground hover:text-foreground self-start"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                Quiz Results
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {moduleCode}
              </p>
            </div>
            <PDFDownloadButton
              elementId="quiz-results-content"
              filename={`Quiz-Results-${moduleCode}-${getTimestampForFilename()}.pdf`}
              title={`Quiz Results - ${moduleCode}`}
              className="w-full sm:w-auto"
            />
          </div>

          <div id="quiz-results-content" className="print:block">
            {/* Score Card */}
            <Card className="mb-6 md:mb-8 bg-card border-border">
              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className={`w-8 h-8 md:w-10 md:h-10 ${getScoreColor()}`} />
                  </div>
                </div>
                <CardTitle className={`text-4xl md:text-5xl font-bold ${getScoreColor()}`}>
                  {percentage}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-base md:text-lg text-foreground font-medium">
                  {getScoreMessage()}
                </p>
                <p className="text-sm md:text-base text-muted-foreground">
                  You got {correctCount} out of {totalQuestions} questions correct
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleRetakeQuiz}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake Quiz
                  </Button>
                  <Button onClick={() => navigate(`/modules/${moduleCode}`)} className="w-full sm:w-auto">
                    Back to Module
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Breakdown */}
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">
              Question Breakdown
            </h3>
            <div className="space-y-3 md:space-y-4">
              {results.map((result, index) => (
                <Card
                  key={result.id}
                  className={`p-4 md:p-5 border-l-4 ${
                    result.isCorrect
                      ? 'border-l-green-500 bg-green-500/5'
                      : 'border-l-red-500 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="flex-shrink-0">
                      {result.isCorrect ? (
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 md:space-y-3 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <p className="text-sm md:text-base text-foreground font-medium">
                          <span className="text-muted-foreground mr-2">
                            Q{index + 1}.
                          </span>
                          {result.question}
                        </p>
                        <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground self-start">
                          {result.type === 'multiple-choice' && 'Multiple Choice'}
                          {result.type === 'true-false' && 'True/False'}
                          {result.type === 'fill-blank' && 'Fill in the Blank'}
                        </span>
                      </div>

                      <div className="grid gap-2 text-xs md:text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-muted-foreground sm:w-28">
                            Your answer:
                          </span>
                          <span
                            className={`font-medium ${
                              result.isCorrect ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {result.userAnswer || '(No answer provided)'}
                          </span>
                        </div>
                        {!result.isCorrect && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-muted-foreground sm:w-28">
                              Correct answer:
                            </span>
                            <span className="font-medium text-green-600">
                              {result.correctAnswer}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                variant="outline"
                onClick={handleRetakeQuiz}
                className="gap-2 w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Quiz
              </Button>
              <Button onClick={() => navigate('/modules')} className="w-full sm:w-auto">
                Browse More Modules
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default QuizResults;

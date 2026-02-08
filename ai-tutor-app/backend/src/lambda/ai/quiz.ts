import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { getRagService } from '../../services/rag.service';
import { DatabaseConfig } from '../../config/database.config';
import { generateQuizSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { Quiz } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Helper: Resolve studentId from JWT token with email fallback
 */
async function getStudentIdFromAuth(event: APIGatewayProxyEvent): Promise<string> {
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!userId) {
        throw new BadRequestError('User authentication required');
    }

    // Query student by userId to get studentId
    let { items } = await DynamoDBService.query(
        tables.STUDENTS,
        'userId = :userId',
        { ':userId': userId },
        { indexName: 'userId-index' }
    );

    // If not found by userId, try email lookup (fallback)
    if ((!items || items.length === 0)) {
        const email = event.requestContext?.authorizer?.claims?.email;
        if (email) {
            LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
            const emailResult = await DynamoDBService.query(
                tables.STUDENTS,
                'email = :email',
                { ':email': email },
                { indexName: 'email-index' }
            );
            items = emailResult.items || [];
        }
    }

    if (!items || items.length === 0) {
        throw new NotFoundError('Student profile not found');
    }

    return items[0].studentId;
}

/**
 * POST /api/quiz/generate - Generate quiz from module content
 */
export async function handleGenerateQuiz(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return LambdaUtil.wrap(async () => {
        const body = LambdaUtil.parseBody(event);
        const studentId = await getStudentIdFromAuth(event);

        // Validate input
        const input = generateQuizSchema.parse(body);

        // Get module by code (moduleId might be a code like "CS101")
        let module: any;
        try {
            // Try direct lookup first (if moduleId is actual ID)
            module = await DynamoDBService.get(tables.MODULES, { moduleId: input.moduleId });
        } catch (e) {
            // Fall back to scan by moduleCode
            LoggerUtil.info('Module lookup by ID failed, trying by code', { moduleId: input.moduleId });
        }
        
        if (!module) {
            // Scan by moduleCode (in case input is a code like "CS101")
            const { items } = await DynamoDBService.scan(
                tables.MODULES,
                {
                    filterExpression: 'moduleCode = :code',
                    expressionAttributeValues: { ':code': input.moduleId }
                }
            );
            
            if (!items || items.length === 0) {
                throw new NotFoundError(`Module not found: ${input.moduleId}`);
            }
            module = items[0];
        }

        // Verify enrollment using actual module ID
        const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
        if (!student || !student.moduleIds || !student.moduleIds.includes(module.moduleId)) {
          throw new ForbiddenError('You are not enrolled in this module');
        }

        // Generate quiz using RAG only (no Claude fallback)
        let quizContent: any;

        const ragService = getRagService();
        if (!ragService.isEnabled()) {
            throw new BadRequestError('RAG service is not enabled for quiz generation');
        }

        // Get RAG documents for selected content items only
        let ragDocumentIds: string[] = [];

        if (input.contentIds && input.contentIds.length > 0) {
            // Get RAG documents only for selected content items
            for (const contentId of input.contentIds) {
                const file = await DynamoDBService.get(tables.FILES, { fileId: contentId });
                if (!file) {
                    LoggerUtil.warn('[RAG] File not found in DynamoDB', {
                        fileId: contentId
                    });
                    continue;
                }
                if (file && file.ragDocumentId && file.ragProcessingStatus === 'COMPLETE') {
                    ragDocumentIds.push(file.ragDocumentId);
                    LoggerUtil.info('[RAG] Using RAG document from selected content', {
                        fileId: contentId,
                        ragDocumentId: file.ragDocumentId
                    });
                } else {
                    LoggerUtil.warn('[RAG] File has no valid RAG mapping', {
                        fileId: contentId,
                        ragDocumentId: file?.ragDocumentId,
                        status: file?.ragProcessingStatus
                    });
                }
            }
        } else {
            // Fallback: Get all RAG documents for this module if no content selected
            const { items: files } = await DynamoDBService.scan(
                tables.FILES,
                {
                    filterExpression: 'moduleId = :moduleId AND attribute_exists(ragDocumentId) AND ragProcessingStatus = :complete',
                    expressionAttributeValues: {
                        ':moduleId': module.moduleId,
                        ':complete': 'COMPLETE'
                    }
                }
            );

            ragDocumentIds = (files || [])
                .filter(f => f.ragDocumentId && f.ragProcessingStatus === 'COMPLETE')
                .map(f => f.ragDocumentId);

            LoggerUtil.info('[RAG] Using all module RAG documents (no content selected)', {
                moduleId: module.moduleId,
                documentCount: ragDocumentIds.length
            });
        }

        if (!ragDocumentIds || ragDocumentIds.length === 0) {
            throw new NotFoundError('No RAG documents available for this module. Quiz generation requires processed documents.');
        }

        LoggerUtil.info('[RAG] Generating quiz using RAG', {
            moduleId: module.moduleId,
            documentCount: ragDocumentIds.length
        });

        const ragResponse = await ragService.generateQuiz(
            module.moduleId,
            input.contentIds?.[0] || module.moduleId,
            ragDocumentIds,
            input.numQuestions || 20,
            `Quiz for ${module.moduleName || module.title}`
        );

        quizContent = ragResponse.quiz;

        LoggerUtil.info('[RAG] Quiz generated by RAG', {
            quizId: ragResponse.quiz.id,
            questionCount: ragResponse.quiz.questions.length
        });

        // Normalize questions: consolidate correctAnswer/correctAnswers into correctAnswer field
        const questionsWithIds = quizContent.questions.map((q: any, idx: number) => {
            const normalized: any = {
                ...q,
                questionId: q.questionId || UuidUtil.generateWithPrefix('qst')
            };
            
            // Handle the new schema: if correctAnswers array exists, use it; else use correctAnswer
            if (q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
                normalized.correctAnswer = q.correctAnswers;
            } else if (!normalized.correctAnswer && q.correctAnswer) {
                normalized.correctAnswer = q.correctAnswer;
            }
            
            // Clean up schema fields that shouldn't be stored
            delete normalized.correctAnswers;
            
            return normalized;
        });

        // Store quiz with actual module ID
        const quiz: Quiz = {
          quizId: UuidUtil.generateWithPrefix('quiz'),
          moduleId: module.moduleId,
          contentIds: input.contentIds,
          title: `${module.moduleName || module.title} - AI Generated Quiz`,
          description: `Auto-generated comprehensive quiz with ${questionsWithIds.length} questions including single-select, multi-select, fill-in-the-blank, and true/false questions`,
          questions: questionsWithIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: studentId,
        };

        await DynamoDBService.put(tables.QUIZZES, quiz);

        LoggerUtil.info('Quiz generated', {
            quizId: quiz.quizId,
            moduleId: input.moduleId,
            studentId,
        });

        return ResponseUtil.lambdaResponse(
            201,
            ResponseUtil.success(quiz, 'Quiz generated successfully')
        );
    });
}

/**
 * GET /api/quiz/{quizId} - Get quiz details
 */
export async function handleGetQuiz(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return LambdaUtil.wrap(async () => {
        const quizId = LambdaUtil.getPathParam(event, 'quizId');

        if (!quizId) {
            throw new BadRequestError('Quiz ID is required');
        }

        const studentId = await getStudentIdFromAuth(event);

        // Get quiz
        const quiz = await DynamoDBService.get(tables.QUIZZES, { quizId });
        if (!quiz) {
            throw new NotFoundError('Quiz not found');
        }

        // Verify enrollment in module
        const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
        if (!student || !student.moduleIds || !student.moduleIds.includes(quiz.moduleId)) {
            throw new ForbiddenError('You are not enrolled in this module');
        }

        return ResponseUtil.lambdaResponse(200, ResponseUtil.success(quiz));
    });
}

/**
 * POST /api/quiz/{quizId}/submit - Submit quiz answers
 */
export async function handleSubmitQuiz(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return LambdaUtil.wrap(async () => {
        const quizId = LambdaUtil.getPathParam(event, 'quizId');
        const body = LambdaUtil.parseBody(event);

        if (!quizId) {
            throw new BadRequestError('Quiz ID is required');
        }

        const studentId = await getStudentIdFromAuth(event);
        const answers = body.answers || {};

        // Get quiz
        const quiz = await DynamoDBService.get(tables.QUIZZES, { quizId });
        if (!quiz) {
            throw new NotFoundError('Quiz not found');
        }

        // Verify enrollment
        const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
        if (!student || !student.moduleIds || !student.moduleIds.includes(quiz.moduleId)) {
            throw new ForbiddenError('You are not enrolled in this module');
        }

        // Calculate score
        let score = 0;
        let totalPoints = 0;

        quiz.questions.forEach((question) => {
            totalPoints += question.points;
            if (answers[question.questionId] === question.correctAnswer) {
                score += question.points;
            }
        });

        // Store result
        const result = {
            resultId: UuidUtil.generateWithPrefix('result'),
            studentId,
            quizId,
            moduleId: quiz.moduleId,
            score,
            totalPoints,
            percentage: (score / totalPoints) * 100,
            submittedAt: new Date().toISOString(),
        };

        await DynamoDBService.put(tables.QUIZ_RESULTS, result);

        LoggerUtil.info('Quiz submitted', {
            quizId,
            studentId,
            score,
            totalPoints,
        });

        return ResponseUtil.lambdaResponse(
            200,
            ResponseUtil.success(result, 'Quiz submitted successfully')
        );
    });
}

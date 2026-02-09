import express, { Express, Request, Response } from 'express';
import { EnvConfig } from './config/environment';
import { corsMiddleware } from './middleware/cors.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware, asyncHandler } from './middleware/error.middleware';
import { ResponseUtil } from './utils/response.util';
import { LoggerUtil } from './utils/logger.util';
import {
  listDepartmentsHandler,
  createDepartmentHandler,
  getDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
  listFacultiesHandler,
  createFacultyHandler,
  getFacultyHandler,
  updateFacultyHandler,
  deleteFacultyHandler,
  listCampusesHandler,
  createCampusHandler,
  getCampusHandler,
  updateCampusHandler,
  deleteCampusHandler,
  listCoursesHandler,
  createCourseHandler,
  getCourseHandler,
  updateCourseHandler,
  deleteCourseHandler,
  listModulesHandler,
  createModuleHandler,
  getModuleHandler,
  updateModuleHandler,
  deleteModuleHandler,
  listLecturersHandler,
  createLecturerHandler,
  getLecturerHandler,
  updateLecturerHandler,
  deleteLecturerHandler,
  listStudentsHandler,
  createStudentHandler,
  getStudentHandler,
  updateStudentHandler,
  deleteStudentHandler,
  listFilesHandler,
} from './lambda/admin/handler';

// NEW: Student endpoint handlers
import {
  getStudentProfileHandler,
  getModuleContentHandler,
  getDownloadUrlHandler,
  listEnrolledModulesHandler,
} from './lambda/student/handler';
import { handleGetModuleHierarchy } from './lambda/student/module-hierarchy';

// NEW: Educator endpoint handlers
import {
  getEducatorProfileHandler,
  getUploadLinkHandler,
  saveFileMetadataHandler,
  listModuleFilesHandler_Portal,
  deleteFileHandler_Portal,
  listModulesHandler as listEducatorModulesHandler,
  getDownloadUrlHandler as educatorGetDownloadUrlHandler,
} from './lambda/educator/handler';

// Chunks viewer handlers
import { getFileChunks, getFileChunk } from './lambda/educator/chunks';

// NEW: Authorization middleware
import { authMiddleware, roleMiddleware } from './middleware/auth.middleware';

// Auth handlers
import { registerHandler, loginHandler, refreshHandler, verifyEmailCodeHandler } from './lambda/auth/handler';

// NEW: Activation flow handlers
import { registerActivationHandler, verifyActivationHandler, checkActivationStatusHandler } from './lambda/auth/handler';

// DEBUG handlers
import { handleListCodes } from './lambda/debug/handler';

// NEW: AI endpoint handlers
import {
  createSessionHandler,
  getSessionHandler,
  sendMessageHandler,
  listSessionsHandler,
  getMessagesHandler,
  deleteSessionHandler,
  generateQuizHandler,
  getQuizHandler,
  submitQuizHandler,
  generateSummaryHandler,
} from './lambda/ai/handler';

// Initialize environment config
EnvConfig.getConfig();

const app: Express = express();

/**
 * Global middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(corsMiddleware);
app.use(loggerMiddleware);

/**
 * Lambda-to-Express adapter
 */
const adaptLambdaHandler = (handler: any) => {
  return asyncHandler(async (req: any, res: Response) => {
    // Convert query params to proper format
    const queryStringParameters: Record<string, string> = {};
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key];
      if (typeof value === 'string') {
        queryStringParameters[key] = value;
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        queryStringParameters[key] = value[0] as string;
      }
    });

    const event: any = {
      httpMethod: req.method,
      path: req.path,
      body: req.body ? JSON.stringify(req.body) : null,
      queryStringParameters: Object.keys(queryStringParameters).length ? queryStringParameters : null,
      pathParameters: req.params && Object.keys(req.params).length ? req.params : null,
      headers: req.headers,
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        authorizer: {
          principalId: 'user',
          claims: {
            sub: req.userId,
            'custom:role': req.role,
            email: req.email,
          },
        },
        domainName: req.hostname,
        httpMethod: req.method,
        identity: { sourceIp: req.ip },
        protocol: req.protocol,
        requestId: `${Date.now()}`,
        requestTime: new Date().toISOString(),
        requestTimeEpoch: Date.now(),
        resourceId: 'resource-id',
        resourcePath: req.path,
        stage: 'dev',
      },
    };

    try {
      LoggerUtil.debug('Handler called', { method: req.method, path: req.path });
      const result = await handler(event);
      LoggerUtil.debug('Handler result', { statusCode: result?.statusCode });

      if (result && result.statusCode) {
        res.status(result.statusCode);
        if (result.body) {
          const bodyData = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
          res.json(bodyData);
        } else {
          res.send('');
        }
      } else {
        LoggerUtil.error('Invalid handler response', { result });
        res.status(500).json({ error: 'Invalid handler response' });
      }
    } catch (error: any) {
      LoggerUtil.error('Lambda handler error', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });
};

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json(ResponseUtil.success({ status: 'ok' }, 'Service is healthy'));
});

/**
 * Root endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.status(200).json(
    ResponseUtil.success(
      {
        service: 'TutorVerse Backend API',
        version: '1.0.0',
        environment: EnvConfig.get('ENVIRONMENT'),
      },
      'Welcome to TutorVerse Backend'
    )
  );
});

/**
 * API Routes - Admin Endpoints
 */

// Departments routes
app.get('/api/admin/departments', adaptLambdaHandler(listDepartmentsHandler));
app.post('/api/admin/departments', adaptLambdaHandler(createDepartmentHandler));
app.get('/api/admin/departments/:id', adaptLambdaHandler(getDepartmentHandler));
app.put('/api/admin/departments/:id', adaptLambdaHandler(updateDepartmentHandler));
app.delete('/api/admin/departments/:id', adaptLambdaHandler(deleteDepartmentHandler));

// Faculties routes
app.get('/api/admin/faculties', adaptLambdaHandler(listFacultiesHandler));
app.post('/api/admin/faculties', adaptLambdaHandler(createFacultyHandler));
app.get('/api/admin/faculties/:id', adaptLambdaHandler(getFacultyHandler));
app.put('/api/admin/faculties/:id', adaptLambdaHandler(updateFacultyHandler));
app.delete('/api/admin/faculties/:id', adaptLambdaHandler(deleteFacultyHandler));

// Campuses routes
app.get('/api/admin/campuses', adaptLambdaHandler(listCampusesHandler));
app.post('/api/admin/campuses', adaptLambdaHandler(createCampusHandler));
app.get('/api/admin/campuses/:id', adaptLambdaHandler(getCampusHandler));
app.put('/api/admin/campuses/:id', adaptLambdaHandler(updateCampusHandler));
app.delete('/api/admin/campuses/:id', adaptLambdaHandler(deleteCampusHandler));

// Courses routes
app.get('/api/admin/courses', adaptLambdaHandler(listCoursesHandler));
app.post('/api/admin/courses', adaptLambdaHandler(createCourseHandler));
app.get('/api/admin/courses/:id', adaptLambdaHandler(getCourseHandler));
app.put('/api/admin/courses/:id', adaptLambdaHandler(updateCourseHandler));
app.delete('/api/admin/courses/:id', adaptLambdaHandler(deleteCourseHandler));

// Modules routes
app.get('/api/admin/modules', adaptLambdaHandler(listModulesHandler));
app.post('/api/admin/modules', adaptLambdaHandler(createModuleHandler));
app.get('/api/admin/modules/:id', adaptLambdaHandler(getModuleHandler));
app.put('/api/admin/modules/:id', adaptLambdaHandler(updateModuleHandler));
app.delete('/api/admin/modules/:id', adaptLambdaHandler(deleteModuleHandler));

// Lecturers routes
app.get('/api/admin/lecturers', adaptLambdaHandler(listLecturersHandler));
app.post('/api/admin/lecturers', adaptLambdaHandler(createLecturerHandler));
app.get('/api/admin/lecturers/:id', adaptLambdaHandler(getLecturerHandler));
app.put('/api/admin/lecturers/:id', adaptLambdaHandler(updateLecturerHandler));
app.delete('/api/admin/lecturers/:id', adaptLambdaHandler(deleteLecturerHandler));

// Students routes
app.get('/api/admin/students', adaptLambdaHandler(listStudentsHandler));
app.post('/api/admin/students', adaptLambdaHandler(createStudentHandler));
app.get('/api/admin/students/:id', adaptLambdaHandler(getStudentHandler));
app.put('/api/admin/students/:id', adaptLambdaHandler(updateStudentHandler));
app.delete('/api/admin/students/:id', adaptLambdaHandler(deleteStudentHandler));

// Files routes
app.get('/api/admin/files',
  authMiddleware,
  roleMiddleware(['ADMIN', 'super_admin']),
  adaptLambdaHandler(listFilesHandler)
);

/**
 * API Routes - Student Endpoints (Protected)
 * Require: JWT token + STUDENT role
 */
app.get('/api/student/profile',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(getStudentProfileHandler)
);
app.get('/api/student/modules',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(listEnrolledModulesHandler)
);
app.get('/api/student/modules/:moduleCode/content',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(getModuleContentHandler)
);
app.get('/api/student/modules/:moduleId/hierarchy',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(handleGetModuleHierarchy)
);
app.get('/api/student/content/:fileId/download-url',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(getDownloadUrlHandler)
);

/**
 * API Routes - Educator Endpoints (Protected)
 * Require: JWT token + EDUCATOR role
 */
app.get('/api/educator/profile',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(getEducatorProfileHandler)
);
app.get('/api/educator/modules',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(listEducatorModulesHandler)
);
app.post('/api/educator/files/upload-link',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(getUploadLinkHandler)
);
// Direct upload proxy - bypass CORS by uploading through backend
app.post('/api/educator/files/upload',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  express.raw({ type: 'application/octet-stream', limit: '100MB' }),
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user?.sub || (req as any).userId;
      const fileId = req.headers['x-file-id'] as string;
      const moduleCode = req.headers['x-module-code'] as string;
      const fileName = req.headers['x-file-name'] as string;
      
      if (!userId || !fileId || !moduleCode || !fileName) {
        return res.status(400).json({ error: 'Missing required headers' });
      }

      const { S3Service } = await import('./services/s3.service');
      const key = `modules/${moduleCode}/${fileId}/${fileName}`;
      
      // Upload directly to S3
      await S3Service.uploadFile(
        key,
        req.body as Buffer,
        req.headers['content-type'] || 'application/octet-stream'
      );

      res.json({ success: true, fileId, s3Key: key });
    } catch (error: any) {
      console.error('Upload proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
app.post('/api/educator/files',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(saveFileMetadataHandler)
);
app.get('/api/educator/files',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(listModuleFilesHandler_Portal)
);
app.delete('/api/educator/files/:fileId',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(deleteFileHandler_Portal)
);

app.get('/api/educator/files/:fileId/download',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(educatorGetDownloadUrlHandler)
);

/**
 * Chunks viewer endpoints
 */
app.get('/api/educator/files/:fileId/chunks',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(getFileChunks)
);

app.get('/api/educator/files/:fileId/chunks/:chunkIndex',
  authMiddleware,
  roleMiddleware(['EDUCATOR']),
  adaptLambdaHandler(getFileChunk)
);

/**
 * API Routes - Auth Endpoints
 */
app.post('/api/auth/register', adaptLambdaHandler(registerHandler));
app.post('/api/auth/login', adaptLambdaHandler(loginHandler));
app.post('/api/auth/refresh', adaptLambdaHandler(refreshHandler));
app.post('/api/auth/verify-email', adaptLambdaHandler(verifyEmailCodeHandler));

/**
 * API Routes - Activation Flow (Pre-created records)
 * For educators/students that were pre-created by admin
 */
app.post('/api/auth/register-activation', adaptLambdaHandler(registerActivationHandler));
app.post('/api/auth/verify-activation', adaptLambdaHandler(verifyActivationHandler));
app.get('/api/auth/check-activation/:staffNumber', adaptLambdaHandler(checkActivationStatusHandler));

/**
 * API Routes - Quick Bypass (No Email)
 * Generate instant quick access links for existing students/educators
 */
app.post('/api/auth/quick-link-existing', asyncHandler(async (req, res) => {
  try {
    const { studentNumber, staffNumber, role } = req.body;

    if (!role || !['STUDENT', 'EDUCATOR'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role. Must be STUDENT or EDUCATOR' 
      });
    }

    if (!studentNumber && !staffNumber) {
      return res.status(400).json({
        success: false,
        error: 'Provide either studentNumber or staffNumber'
      });
    }

    const { QuickBypassService } = await import('./services/quick-bypass.service');
    const result = await QuickBypassService.generateQuickLinkForExisting(
      studentNumber,
      staffNumber,
      role as 'STUDENT' | 'EDUCATOR'
    );

    res.json({
      success: true,
      data: {
        link: result.link,
        qrCode: result.qrCode,
        expiresAt: result.expiresAt,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate quick link',
    });
  }
}));

/**
 * Validate quick link and authenticate user
 * GET /api/auth/quick?token=...&email=...
 */
app.get('/api/auth/quick', asyncHandler(async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing token or email',
        statusCode: 400,
      });
    }

    const { QuickBypassService } = await import('./services/quick-bypass.service');
    const result = await QuickBypassService.validateQuickLink(
      token as string,
      email as string
    );

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
      statusCode,
    });
  }
}));

/**
 * API Routes - AI Endpoints (NEW)
 * Chat routes - Protected with auth middleware
 */
app.post('/api/chat',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(createSessionHandler)
);
app.get('/api/chat',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(listSessionsHandler)
);
app.get('/api/chat/:sessionId',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(getSessionHandler)
);
app.get('/api/chat/:sessionId/messages',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(getMessagesHandler)
);
app.post('/api/chat/:sessionId/messages',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(sendMessageHandler)
);
app.delete('/api/chat/:sessionId',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(deleteSessionHandler)
);

/**
 * Quiz routes
 */
app.post('/api/quiz/generate',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(generateQuizHandler)
);
app.get('/api/quiz/:quizId',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(getQuizHandler)
);
app.post('/api/quiz/:quizId/submit',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(submitQuizHandler)
);

/**
 * Summary routes
 */
app.post('/api/summary/generate',
  authMiddleware,
  roleMiddleware(['STUDENT']),
  adaptLambdaHandler(generateSummaryHandler)
);

/**
 * DEBUG: List verification codes
 */
app.get('/api/debug/verification-codes', adaptLambdaHandler(handleListCodes));

/**
 * 404 Not Found handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json(
    ResponseUtil.error(
      'NOT_FOUND',
      `Route ${req.method} ${req.path} not found`,
      404
    )
  );
});

/**
 * Global error handler (must be last)
 */
app.use(errorMiddleware);

/**
 * Server startup
 */
export async function startServer() {
  const port = EnvConfig.get('PORT');
  const host = EnvConfig.get('HOST');

  app.listen(port, () => {
    LoggerUtil.info(`Server started`, {
      host,
      port,
      environment: EnvConfig.get('ENVIRONMENT'),
    });
  });
}

/**
 * Export app for testing
 */
export default app;

/**
 * Start if running directly
 */
if (require.main === module) {
  startServer().catch((error) => {
    LoggerUtil.error('Failed to start server', error);
    process.exit(1);
  });
}

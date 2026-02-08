/**
 * Student Lambda Handler - Exports all student endpoints
 * Handles: profile, module enrollment, content access, code file Q&A
 */

export {
  handleGetStudentProfile as getStudentProfileHandler,
} from './profile';

export {
  handleGetModuleContent as getModuleContentHandler,
  handleGetDownloadUrl as getDownloadUrlHandler,
} from './files';

export {
  handleListEnrolledModules as listEnrolledModulesHandler,
  handleGetModule as getModuleHandler,
  handleEnroll as enrollHandler,
  handleListModuleFiles as listModuleFilesHandler,
  handleListModuleQuizzes as listModuleQuizzesHandler,
} from './modules';

/**
 * Educator Lambda Handler - Exports all educator endpoints
 * Handles: profile, module management, file uploads
 */

export {
  handleGetEducatorProfile as getEducatorProfileHandler,
} from './profile';

export {
  handleGetUploadLink as getUploadLinkHandler,
  handleSaveFileMetadata as saveFileMetadataHandler,
  handleListModuleFiles as listModuleFilesHandler_Portal,
  handleDeleteFile as deleteFileHandler_Portal,
} from './portal-files';

export {
  handleListModules as listModulesHandler,
  handleCreateModule as createModuleHandler,
  handleGetModule as getModuleHandler,
  handleUpdateModule as updateModuleHandler,
  handleDeleteModule as deleteModuleHandler,
  handleUpdateContent as updateContentHandler,
} from './modules';

export {
  handleGenerateUploadUrl as generateUploadUrlHandler,
  handleGenerateDownloadUrl as generateDownloadUrlHandler,
  handleDeleteFile as deleteFileHandler,
  handleListModuleFiles as listModuleFilesHandler,
} from './upload';

export {
  handleListMyFiles as listMyFilesHandler,
  handleGetFileDetails as getFileDetailsHandler,
  handleUpdateFileMetadata as updateFileMetadataHandler,
  handleGetDownloadUrl as getDownloadUrlHandler,
  handleListModuleFilesEnhanced as listModuleFilesEnhancedHandler,
} from './files';

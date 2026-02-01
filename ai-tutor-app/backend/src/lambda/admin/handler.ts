/**
 * Admin Lambda Handler - Exports all admin endpoints
 * Handles: lecturer CRUD, student CRUD, module CRUD, supporting tables CRUD (Phase 3)
 */

export {
  handleListLecturers as listLecturersHandler,
  handleCreateLecturer as createLecturerHandler,
  handleGetLecturer as getLecturerHandler,
  handleUpdateLecturer as updateLecturerHandler,
  handleDeleteLecturer as deleteLecturerHandler,
  handleGetLecturerByUserId as getLecturerByUserIdHandler,
} from './lecturers';

export {
  handleListStudents as listStudentsHandler,
  handleCreateStudent as createStudentHandler,
  handleGetStudent as getStudentHandler,
  handleUpdateStudent as updateStudentHandler,
  handleDeleteStudent as deleteStudentHandler,
  handleGetStudentByUserId as getStudentByUserIdHandler,
} from './students';

export {
  handleListModules as listModulesHandler,
  handleCreateModule as createModuleHandler,
  handleGetModule as getModuleHandler,
  handleUpdateModule as updateModuleHandler,
  handleDeleteModule as deleteModuleHandler,
  handleGetModulesByLecturer as getModulesByLecturerHandler,
  handleEnrollModule as enrollModuleHandler,
} from './modules';

export {
  handleListDepartments as listDepartmentsHandler,
  handleCreateDepartment as createDepartmentHandler,
  handleGetDepartment as getDepartmentHandler,
  handleUpdateDepartment as updateDepartmentHandler,
  handleDeleteDepartment as deleteDepartmentHandler,
} from './departments';

export {
  handleListFaculties as listFacultiesHandler,
  handleCreateFaculty as createFacultyHandler,
  handleGetFaculty as getFacultyHandler,
  handleUpdateFaculty as updateFacultyHandler,
  handleDeleteFaculty as deleteFacultyHandler,
} from './faculties';

export {
  handleListCourses as listCoursesHandler,
  handleCreateCourse as createCourseHandler,
  handleGetCourse as getCourseHandler,
  handleUpdateCourse as updateCourseHandler,
  handleDeleteCourse as deleteCourseHandler,
} from './courses';

export {
  handleListCampuses as listCampusesHandler,
  handleCreateCampus as createCampusHandler,
  handleGetCampus as getCampusHandler,
  handleUpdateCampus as updateCampusHandler,
  handleDeleteCampus as deleteCampusHandler,
} from './campuses';

export {
  handleListFiles as listFilesHandler,
  handleGetFile as getFileHandler,
  handleCreateFile as createFileHandler,
  handleUpdateFile as updateFileHandler,
  handleDeleteFile as deleteFileHandler,
  handleBulkUploadFiles as bulkUploadFilesHandler,
} from './files';

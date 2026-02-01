/**
 * Auth Lambda Handler - Exports all auth endpoints
 * Handles: register, login, refresh, user profile, password change, logout
 * Phase 3B: Activation flow endpoints
 */

export {
  handleRegister as registerHandler,
  handleGetUser as getUserHandler,
  handleUpdateProfile as updateProfileHandler,
  handleChangePassword as changePasswordHandler,
} from './register';

export {
  handleRegisterActivation as registerActivationHandler,
  handleVerifyActivation as verifyActivationHandler,
  handleCheckActivationStatus as checkActivationStatusHandler,
} from './register-activation';

export { handleLogin as loginHandler, handleLogout as logoutHandler } from './login';

export { handleRefresh as refreshHandler } from './refresh';

export {
  handleVerifyEmailCode as verifyEmailCodeHandler,
} from './verify-code';

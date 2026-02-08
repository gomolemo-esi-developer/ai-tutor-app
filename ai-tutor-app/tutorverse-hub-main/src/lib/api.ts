/**
 * API Client - Production Integration
 * Connects to real backend on port 3000
 * Uses DynamoDB for data persistence
 */

import { createGlobalApiClient } from '@/services/apiClient';

// Create global API client instance
export const apiClient = createGlobalApiClient();

export default apiClient;

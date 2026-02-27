# PDF Export Authentication Fix

## Problem
The PDF download button was failing with a **401 Unauthorized** error when falling back to the backend proxy endpoint (`/api/pdf/generate`).

### Root Cause
The `generatePDFViaBackend()` function in `pdf-export-gotenberg.ts` was making direct Axios requests without including the JWT authentication token. The backend endpoint requires authentication via the `authMiddleware`, but the request lacked the `Authorization: Bearer <token>` header.

### Error Chain
1. **Gotenberg service not running** → Direct call fails
2. **Fallback to backend proxy** → But no JWT token sent
3. **Backend returns 401** → Request lacks authentication
4. **PDF generation fails** → User sees generic error

## Solution

### 1. Import Global API Client
Added import to access the authenticated API client:
```typescript
import { createGlobalApiClient } from '@/services/apiClient';
```

### 2. Update `generatePDFViaBackend()` Function
Changed to retrieve the JWT token from localStorage (where AuthContext stores it after login):

```typescript
async function generatePDFViaBackend(
  html: string,
  options: PDFExportOptions
): Promise<void> {
  // Get token from localStorage (set by AuthContext on login)
  const token = localStorage.getItem('jwt_token');
  
  if (!token) {
    throw new Error('Authentication required for PDF generation. Please log in.');
  }

  const apiClient = createGlobalApiClient();
  const backendURL = apiClient.getBaseURL();
  
  const response = await axios.post(
    `${backendURL}/api/pdf/generate`,
    {
      html,
      filename: options.filename,
      title: options.title,
    },
    {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  downloadPDF(response.data, options.filename);
}
```

**Key Changes:**
- Retrieve JWT token directly from localStorage (set by AuthContext during login)
- Check if token exists (prevents cryptic errors)
- Pass token in `Authorization` header for backend authentication
- Use the API client to get the configured base URL

### 3. Improved Error Handling in PDFDownloadButton
Enhanced error messages to distinguish between different failure modes:

```typescript
if (errorMsg.includes('Authentication required')) {
    toast.error('You must be logged in to download PDF');
} else if (errorMsg.includes('Network') || errorMsg.includes('ERR_CONNECTION')) {
    toast.error('PDF service is not available. To use PDF export, start Gotenberg...');
} else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
    toast.error('Authentication failed. Please log in again.');
} else {
    toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
}
```

## Files Modified
- `src/utils/pdf-export-gotenberg.ts` - Added API client import and updated `generatePDFViaBackend()`
- `src/components/pdf/PDFDownloadButton.tsx` - Enhanced error handling

## Testing
To verify the fix works:

1. **With Gotenberg running:**
   ```bash
   docker run -d -p 3001:3000 gotenberg/gotenberg:7
   ```
   The direct call should succeed immediately.

2. **Without Gotenberg (fallback):**
   Stop the Gotenberg container and try again. The backend proxy should now work because the JWT token is included.

3. **Unauthenticated requests:**
   If someone tries to download without logging in, they'll get a clear error message instead of a 401.

## JWT Token Flow
```
User Login
    ↓
AuthContext stores token in localStorage
    ↓
AuthContext also sets it in apiClient
    ↓
PDF Export function retrieves token from localStorage
    ↓
Axios request includes Authorization header
    ↓
Backend authMiddleware validates token
    ↓
Request succeeds ✅
```

**Why localStorage?**
- The PDF export utility is not a React component, so it can't use `useAuth` hook
- Token is persisted in localStorage by AuthContext for this exact use case
- This is the same approach used throughout the app for accessing auth state outside React components

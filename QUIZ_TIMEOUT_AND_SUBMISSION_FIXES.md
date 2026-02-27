# Quiz Generation and Submission Fixes

## Issues Fixed

### 1. Quiz Generation Timeout Error
**Problem:** Frontend requests were timing out with "signal is aborted without reason" error.

**Root Cause:** 
- Default timeout in `useApi` hook was 30 seconds
- Quiz generation takes 20-50 seconds (RAG processing)
- Frontend was aborting requests before backend completed

**Solution:**
- Increased timeout in `useApi.ts` from 30s to 120s
- Increased global default in `apiClient.ts` to 120s
- Updated `QuizService.ts` to use 120s for quiz generation
- All requests now consistently use 2-minute timeout

**Files Modified:**
- `src/hooks/useApi.ts` - Changed default timeout to 120000ms
- `src/services/apiClient.ts` - Updated global default to 120000ms
- `src/services/QuizService.ts` - Updated quiz generation timeout to 120000ms

### 2. Quiz Submission 404 Error
**Problem:** `POST /api/quiz/submit` returned 404 Not Found

**Root Cause:**
- Frontend was calling `/api/quiz/submit` 
- Backend expects `/api/quiz/{quizId}/submit` 
- Frontend wasn't extracting quizId from generation response

**Solution:**
- Added `quizId` state to Quiz.tsx component
- Extract quizId from quiz generation response
- Use correct endpoint: `/api/quiz/{quizId}/submit`
- Store quizId when quiz is generated

**Files Modified:**
- `src/pages/student/Quiz.tsx`:
  - Added `const [quizId, setQuizId] = useState<string | null>(null)`
  - Updated `fetchQuestions()` to extract and store quizId
  - Updated `handleSubmit()` to use correct endpoint with quizId

### 3. React Key Warning
**Problem:** Console warning "Each child in a list should have a unique 'key' prop" in QuizResults

**Root Cause:** 
- QuizResult objects may not always have an `id` field
- Using undefined key caused React warnings

**Solution:**
- Changed key from `result.id` to `result.id || index`
- Provides fallback to array index if id is missing

**Files Modified:**
- `src/pages/student/QuizResults.tsx` - Line 143: Updated key prop

## Testing

To verify the fixes:

1. **Quiz Generation**
   - Generate a quiz from module content
   - Should complete within 2 minutes without timeout errors
   - Check browser console for successful `POST /api/quiz/generate: Object` log

2. **Quiz Submission** 
   - Complete a quiz and click Submit
   - Should successfully call `/api/quiz/{quizId}/submit`
   - Backend logs should show: `"Response sent", {"method":"POST","path":"/api/quiz/:quizId/submit","statusCode":200}`
   - Results page should load without errors

3. **PDF Export**
   - Note: PDF export requires Gotenberg service running on port 3001
   - Currently fails with "Network Error" because Gotenberg is not running
   - This is a separate infrastructure issue, not a code issue

## Backend Endpoints

- `POST /api/quiz/generate` - Returns quiz with quizId in response
- `POST /api/quiz/{quizId}/submit` - Submits answers for specific quiz
- `GET /api/quiz/{quizId}` - Retrieves quiz details

## Timeout Configuration

All components now consistently use **120-second timeout**:
- Short operations complete in <5s
- Quiz generation (RAG processing) takes 15-50s depending on document size
- 120s provides sufficient buffer for network delays and processing

## Notes

- React StrictMode was causing duplicate requests in development
- Fixed with proper cleanup logic in useEffect
- useApi hook now supports custom timeout per request if needed
- No breaking changes to existing API structure

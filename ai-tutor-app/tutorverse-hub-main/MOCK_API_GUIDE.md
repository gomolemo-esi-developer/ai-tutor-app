# Mock API Quick Reference Guide

**Frontend:** tutorverse-hub-main  
**Status:** Running in Mock Mode (Production Ready)

---

## Quick Start

### Using the Mock API Hook

```typescript
import { useApi } from '@/hooks/useApi';

function MyComponent() {
  const { data, loading, error, get, post, put, delete: del } = useApi();

  const fetchData = async () => {
    const campuses = await get('/api/admin/campuses');
    console.log(campuses); // Returns mock campus data
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {data && <p>Data loaded: {JSON.stringify(data)}</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={fetchData}>Fetch Campuses</button>
    </div>
  );
}
```

---

## Available Endpoints (All Mock)

### Admin Endpoints
```javascript
GET  /api/admin/campuses       // Get all campuses
POST /api/admin/campuses       // Create campus
PUT  /api/admin/campuses/{id}  // Update campus
DELETE /api/admin/campuses/{id} // Delete campus

GET  /api/admin/departments    // Get all departments
POST /api/admin/departments    // Create department
PUT  /api/admin/departments/{id}
DELETE /api/admin/departments/{id}

GET  /api/admin/courses        // Get all courses
POST /api/admin/courses        // Create course
PUT  /api/admin/courses/{id}
DELETE /api/admin/courses/{id}

GET  /api/admin/stats          // Get dashboard statistics
```

### Educator Endpoints
```javascript
GET /api/educators/modules         // Get educator's modules
POST /api/educators/modules        // Create new module
GET /api/educators/profile         // Get educator profile
GET /api/educators/files?moduleId=X // Get files for module
POST /api/educators/files          // Upload file
DELETE /api/educators/files/{id}   // Delete file
```

### Student Endpoints
```javascript
GET /api/students/profile      // Get student profile
GET /api/students/modules      // Get enrolled modules
```

### Chat Endpoints
```javascript
GET /api/chat                  // Get all chat sessions
POST /api/chat                 // Create new chat session
GET /api/chat/{id}/messages    // Get messages in session
POST /api/chat/{id}/messages   // Send message
DELETE /api/chat/{id}          // Delete chat session
```

---

## Mock Authentication

### Demo Users

| Email | Password | Role |
|-------|----------|------|
| student@test.com | (any) | student |
| educator@test.com | (any) | educator |
| admin@test.com | (any) | admin |

### Using Authentication

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginPage() {
  const { login, user } = useAuth();

  const handleLogin = async () => {
    const success = await login('student@test.com', 'password123');
    if (success) {
      console.log('Logged in as:', user);
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

---

## Response Format

All API calls return data in this format:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}
```

### Example Response

```javascript
// Request
const campuses = await get('/api/admin/campuses');

// Response
{
  data: [
    {
      id: 'campus-1',
      name: 'Main Campus',
      abbreviation: 'M',
      address: 'New York, USA'
    },
    {
      id: 'campus-2',
      name: 'Downtown Campus',
      abbreviation: 'D',
      address: 'Boston, USA'
    }
  ]
}
```

---

## Loading States

```typescript
const { loading, data } = useApi();

if (loading) return <LoadingSpinner />;
if (data?.length === 0) return <EmptyState />;
return <DataTable data={data} />;
```

---

## Error Handling

```typescript
const { error, get } = useApi();

const fetchData = async () => {
  const data = await get('/api/admin/campuses');
  if (error) {
    // Handle error
    toast({ title: 'Error', description: error });
  }
};
```

---

## File Upload

```typescript
import { useMockApi } from '@/hooks/useMockApi';

function FileUpload() {
  const { post } = useMockApi();

  const handleUpload = async (file: File, moduleId: string) => {
    const response = await post('/api/educators/files', {
      file,
      moduleId,
    });
    console.log('Uploaded:', response);
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0], 'module-1')} />;
}
```

---

## Service Usage

You can also use services directly:

```typescript
import { AdminService } from '@/services';

// Get departments
const departments = await AdminService.getDepartments();

// Create user
const newUser = await AdminService.createUser({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
});
```

---

## Mock Data Sources

All mock data comes from `src/data/mockData.ts`:

```typescript
// Available mock data
export const mockModules: Module[]        // 3 modules
export const mockChatSessions: ChatSession[] // 2 sessions
export const mockMessages: Record<string, ChatMessage[]> // Per-session
export const mockDepartments                // 3 departments
export const mockCampuses                   // 2 campuses
export const mockLecturers                  // 2 lecturers
export const mockStudents                   // 2 students
export const mockAdminStats                 // Dashboard stats
export const mockQuestions: Question[]      // 3 quiz questions
```

---

## Integration Checklist

When ready to integrate real backend API:

- [ ] Update `src/services/mockApiService.ts` to make real HTTP calls
- [ ] Replace `fetch()` with axios or fetch client
- [ ] Update endpoint URLs to match backend
- [ ] Implement proper authentication (JWT tokens)
- [ ] Remove mock user hardcoding
- [ ] Add error retry logic
- [ ] Implement caching if needed
- [ ] Add request/response logging
- [ ] Test all endpoints

---

## Common Patterns

### Fetch and Display
```typescript
useEffect(() => {
  const load = async () => {
    const data = await get('/api/admin/campuses');
    setCampuses(data);
  };
  load();
}, [get]);
```

### Create and Refresh
```typescript
const handleCreate = async (formData) => {
  const newItem = await post('/api/admin/campuses', formData);
  // Refresh list
  const updated = await get('/api/admin/campuses');
  setCampuses(updated);
};
```

### Delete with Confirmation
```typescript
const handleDelete = async (id) => {
  if (confirm('Delete this item?')) {
    await del(`/api/admin/campuses/${id}`);
    // Refresh list
    const updated = await get('/api/admin/campuses');
    setCampuses(updated);
  }
};
```

---

## Tips

1. **Mock delays** - API calls include 300ms delay to simulate network
2. **No persistence** - Data is not saved between page refreshes
3. **Optimistic updates** - Create/update/delete return immediately
4. **Type-safe** - All responses are typed with TypeScript
5. **Dev-friendly** - Easy to see what data is being used
6. **No external dependencies** - Works offline with no backend

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/services/mockApiService.ts` | Mock API implementation |
| `src/hooks/useMockApi.ts` | Hook for mock API calls |
| `src/hooks/useApi.ts` | Wrapper hook (compatibility) |
| `src/data/mockData.ts` | Mock data definitions |
| `src/contexts/AuthContext.tsx` | Authentication with mock users |
| `src/services/*Service.ts` | Service wrappers (use mock API) |

---

## Support

For questions about the mock API setup, see:
- `FRONTEND_CLEANUP_COMPLETED.md` - Detailed cleanup info
- `FRONTEND_DEPRECATED_API_ANALYSIS.md` - Original analysis
- Comments in `src/services/mockApiService.ts` - Implementation details


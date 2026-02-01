/**
 * Mock Data - Replaces Backend API Calls
 * Frontend operates with local data only (no backend)
 */

export interface Module {
  id: string;
  title: string;
  description: string;
  code: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

// Mock modules
export const mockModules: Module[] = [
  {
    id: 'module-1',
    title: 'Introduction to Computer Science',
    description: 'Fundamentals of programming and algorithms',
    code: 'CS101',
  },
  {
    id: 'module-2',
    title: 'Data Structures',
    description: 'Learn arrays, linked lists, trees, and graphs',
    code: 'CS201',
  },
  {
    id: 'module-3',
    title: 'Web Development',
    description: 'HTML, CSS, JavaScript, and React',
    code: 'CS301',
  },
];

// Mock chat sessions
export const mockChatSessions: ChatSession[] = [
  {
    id: 'chat-1',
    title: 'CS101 Concepts',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'chat-2',
    title: 'Algorithm Help',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Mock messages
export const mockMessages: Record<string, ChatMessage[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      sender: 'user',
      content: 'What is an algorithm?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'msg-2',
      chatId: 'chat-1',
      sender: 'assistant',
      content: 'An algorithm is a step-by-step procedure for solving a problem.',
      timestamp: new Date(Date.now() - 3500000).toISOString(),
    },
  ],
  'chat-2': [
    {
      id: 'msg-3',
      chatId: 'chat-2',
      sender: 'user',
      content: 'How do I implement quicksort?',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

// Mock quiz questions
export const mockQuestions: Question[] = [
  {
    id: 'q-1',
    question: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(log n)', 'O(n²)', 'O(2^n)'],
    correctAnswer: 1,
  },
  {
    id: 'q-2',
    question: 'Which data structure uses LIFO principle?',
    options: ['Queue', 'Stack', 'Tree', 'Graph'],
    correctAnswer: 1,
  },
  {
    id: 'q-3',
    question: 'What is polymorphism in OOP?',
    options: ['Inheritance', 'Encapsulation', 'Multiple implementations', 'Abstraction'],
    correctAnswer: 2,
  },
];

// Mock departments
export const mockDepartments = [
  { id: 'dept-1', name: 'Computer Science', code: 'CS' },
  { id: 'dept-2', name: 'Information Technology', code: 'IT' },
  { id: 'dept-3', name: 'Software Engineering', code: 'SE' },
];

// Mock campuses
export const mockCampuses = [
  { id: 'campus-1', name: 'Main Campus', city: 'New York', country: 'USA' },
  { id: 'campus-2', name: 'Downtown Campus', city: 'Boston', country: 'USA' },
];

// Mock lecturers
export const mockLecturers = [
  {
    id: 'lecturer-1',
    firstName: 'Dr. Jane',
    lastName: 'Smith',
    email: 'jane.smith@university.edu',
    department: 'CS',
    campus: 'Main Campus',
  },
  {
    id: 'lecturer-2',
    firstName: 'Prof. John',
    lastName: 'Doe',
    email: 'john.doe@university.edu',
    department: 'IT',
    campus: 'Downtown Campus',
  },
];

// Mock students
export const mockStudents = [
  {
    id: 'student-1',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@student.edu',
    studentId: 'STU001',
    department: 'CS',
    campus: 'Main Campus',
  },
  {
    id: 'student-2',
    firstName: 'Bob',
    lastName: 'Williams',
    email: 'bob@student.edu',
    studentId: 'STU002',
    department: 'IT',
    campus: 'Downtown Campus',
  },
];

// Admin stats
export const mockAdminStats = {
  totalStudents: 1250,
  totalLecturers: 45,
  totalModules: 89,
  totalCampuses: 2,
  activeChats: 312,
};

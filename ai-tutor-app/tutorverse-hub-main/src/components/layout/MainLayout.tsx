import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LeftSidebar from './LeftSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  rightSidebar?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, rightSidebar }) => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <LeftSidebar />
      <main className="flex-1 overflow-hidden flex flex-col mt-14 md:mt-0">
        {children}
      </main>
      {rightSidebar}
    </div>
  );
};

export default MainLayout;

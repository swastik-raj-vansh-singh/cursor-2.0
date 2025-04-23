
import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTheme } from '@/store/useAppStore';

const Index = () => {
  const { theme } = useTheme();
  
  // Apply theme class to document on initial load
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <MainLayout />;
};

export default Index;

'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string>('ADMIN');

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar role={role} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

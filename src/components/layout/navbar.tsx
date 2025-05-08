"use client";

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { User } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-secondary p-4 flex justify-between items-center">
      <Link href="/" className="text-lg font-semibold">Exam Portal</Link>
      {user ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <User className="mr-2"/>
            <span>{user.email} ({user.role})</span>
          </div>
          <Button onClick={logout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      ) : (
        <Link href="/" className="text-blue-500">Login</Link>
      )}
    </div>
  );
}

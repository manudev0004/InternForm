"use client";

import {SignInPage} from '@/components/auth/sign-in-page';
import { useAuth } from "@/components/auth/auth-provider";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'intern':
          router.push('/intern');
          break;
        case 'guest':
          router.push('/guest');
          break;
        default:
          break;
      }
    }
  }, [user, router]);

  return (
    <div className="grid h-screen place-items-center">
      <SignInPage />
    </div>
  );
}

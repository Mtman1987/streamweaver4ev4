
"use client";

import AppSidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { SidebarInset } from '@/components/ui/sidebar';
import { LogPanel } from '@/components/logs/log-panel';
import { LogPanelProvider } from '@/components/logs/log-panel-context';
import { LiveStreamersProvider } from '@/contexts/live-streamers-context';
import { useState, useEffect } from 'react';

export type UserProfile = {
  twitch?: {
    name: string;
    avatar: string;
  } | null,
  discord?: {
    name: string;
    avatar: string;
  } | null
}

// NOTE: We are fetching this on the client to avoid Next.js static generation issues with server-side fetches.
// In a real app, this would likely be handled by a proper client-side session.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userProfile, setUserProfile] = useState<UserProfile>({});

  useEffect(() => {
    async function fetchUserProfile() {
        try {
            const response = await fetch('/api/user-profile');
        if (response.status === 401 || response.status === 404) {
          window.location.href = '/login';
          return;
        }
        if (response.ok) {
                const data = await response.json();
                setUserProfile(data);
            } else {
                 console.error("Failed to fetch user profile");
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    }

    async function ensureConfigured() {
      try {
        const response = await fetch('/api/user-config', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        if (!data?.complete) {
          window.location.href = '/setup';
        }
      } catch {
        // ignore
      }
    }

    fetchUserProfile();
    ensureConfigured();
  }, []);

  return (
    <LogPanelProvider>
      <LiveStreamersProvider>
        <AppSidebar userProfile={userProfile} />
        <SidebarInset className="bg-background">
          <Header />
          <main className="p-4 sm:px-6 sm:py-0 flex-1 flex flex-col">
              <div className="flex-1">
                  {children}
              </div>
               <LogPanel />
          </main>
        </SidebarInset>
      </LiveStreamersProvider>
    </LogPanelProvider>
  )
}

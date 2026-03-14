'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { TeamMember } from '@/types';
import { MOCK_USERS } from '@/mock';

interface UserContextValue {
  readonly currentUser: TeamMember;
  readonly switchUser: (userId: string) => void;
  readonly allUsers: ReadonlyArray<TeamMember>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { readonly children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>(MOCK_USERS[0].id);

  const currentUser = useMemo(
    () => MOCK_USERS.find((u) => u.id === currentUserId) ?? MOCK_USERS[0],
    [currentUserId]
  );

  const switchUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
  }, []);

  const value = useMemo(
    () => ({ currentUser, switchUser, allUsers: MOCK_USERS }),
    [currentUser, switchUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return ctx;
}

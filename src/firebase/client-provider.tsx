'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously, getAuth } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function AuthWrapper({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = getAuth();

  useEffect(() => {
    if (!isUserLoading && !user) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
    }
  }, [user, isUserLoading, auth]);

  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthWrapper>
        {children}
      </AuthWrapper>
    </FirebaseProvider>
  );
}

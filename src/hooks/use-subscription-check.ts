"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export function useSubscriptionCheck() {
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';
  const isBusiness = subscriptionPlan === 'business';
  const isProfessional = subscriptionPlan === 'professional';
  const isPaidPlan = isBusiness || isProfessional;
  
  return {
    subscriptionPlan,
    isFreemium,
    isBusiness,
    isProfessional,
    isPaidPlan,
    user,
    userData,
  };
}


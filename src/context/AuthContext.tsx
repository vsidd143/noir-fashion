"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "customer" | "admin";

export type CustomerRegistrationData = {
  fullName: string;
  phone?: string;
  houseFlat?: string;
  streetLocality?: string;
  areaLandmark?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  house_number?: string | null;
  street_address?: string | null;
  locality?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
  updated_at?: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authView: "login" | "register" | "forgot" | "magic";
  setAuthView: (view: "login" | "register" | "forgot" | "magic") => void;
  openAuthModal: (view?: "login" | "register" | "forgot" | "magic") => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    customerData?: string | CustomerRegistrationData
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register" | "forgot" | "magic">("login");

  const openAuthModal = (view: "login" | "register" | "forgot" | "magic" = "login") => {
    setAuthView(view);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist yet, create fallback
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "vsidd143@gmail.com";
        const isTargetAdmin = userEmail?.toLowerCase() === adminEmail.toLowerCase();
        
        const fallbackProfile: UserProfile = {
          id: userId,
          email: userEmail || "",
          full_name: userEmail?.split("@")[0] || "Client",
          avatar_url: null,
          phone: null,
          role: isTargetAdmin ? "admin" : "customer",
          is_blocked: false,
          created_at: new Date().toISOString(),
        };

        // Try inserting
        await supabase.from("profiles").upsert(fallbackProfile);
        setProfile(fallbackProfile);
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      }
      setIsLoading(false);
    });

    // 2. Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id, currentSession.user.email);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      closeAuthModal();
    }
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    extra?: string | CustomerRegistrationData
  ) => {
    const customer: CustomerRegistrationData =
      typeof extra === "string" ? { fullName: extra } : extra || { fullName: "" };

    const fullStreet = [customer.houseFlat, customer.streetLocality, customer.areaLandmark]
      .filter(Boolean)
      .join(", ") || customer.streetAddress || "";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: customer.fullName,
          phone: customer.phone,
          house_number: customer.houseFlat,
          street_address: fullStreet,
          locality: customer.streetLocality,
          landmark: customer.areaLandmark,
          city: customer.city || "Mumbai",
          state: customer.state || "Maharashtra",
          postal_code: customer.postalCode,
          country: customer.country || "India",
        },
      },
    });

    if (!error && data?.user) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "vsidd143@gmail.com";
      const isTargetAdmin = email.toLowerCase() === adminEmail.toLowerCase();

      const newProfile: UserProfile = {
        id: data.user.id,
        email: email,
        full_name: customer.fullName,
        avatar_url: null,
        phone: customer.phone || null,
        house_number: customer.houseFlat || null,
        street_address: fullStreet || null,
        locality: customer.streetLocality || null,
        landmark: customer.areaLandmark || null,
        city: customer.city || "Mumbai",
        state: customer.state || "Maharashtra",
        postal_code: customer.postalCode || null,
        country: customer.country || "India",
        role: isTargetAdmin ? "admin" : "customer",
        is_blocked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from("profiles").upsert(newProfile);
        setProfile(newProfile);

        // Always create the first saved delivery address as DEFAULT
        if (fullStreet || customer.city) {
          await supabase.from("addresses").insert({
            user_id: data.user.id,
            title: "Primary Residence",
            recipient_name: customer.fullName,
            phone: customer.phone || null,
            house_number: customer.houseFlat || null,
            street_address: fullStreet || "Address on File",
            locality: customer.streetLocality || null,
            landmark: customer.areaLandmark || null,
            city: customer.city || "Mumbai",
            state: customer.state || "Maharashtra",
            postal_code: customer.postalCode || "400001",
            country: customer.country || "India",
            is_default: true,
          });
        }
      } catch (err) {
        console.error("Error creating customer profile/address:", err);
      }

      // Also store customer in local storage for admin instant visibility fallback
      try {
        const stored = localStorage.getItem("noir_registered_clients");
        const list = stored ? JSON.parse(stored) : [];
        localStorage.setItem("noir_registered_clients", JSON.stringify([newProfile, ...list]));
      } catch {
        // safe fallback
      }
    }

    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error as Error | null };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error as Error | null };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/user/reset-password`,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const isAdmin = profile?.role === "admin" && !profile?.is_blocked;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authView,
        setAuthView,
        openAuthModal,
        closeAuthModal,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithMagicLink,
        resetPasswordForEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

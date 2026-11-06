"use client";

import React, { createContext, useContext, useState } from "react";

type CursorType = "default" | "hover" | "view" | "drag" | "rotate" | "hidden";

type CursorContextType = {
  cursorType: CursorType;
  cursorText: string;
  setCursor: (type: CursorType, text?: string) => void;
  resetCursor: () => void;
};

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export function CursorProvider({ children }: { children: React.ReactNode }) {
  const [cursorType, setCursorType] = useState<CursorType>("default");
  const [cursorText, setCursorText] = useState<string>("");

  const setCursor = (type: CursorType, text: string = "") => {
    setCursorType(type);
    setCursorText(text);
  };

  const resetCursor = () => {
    setCursorType("default");
    setCursorText("");
  };

  return (
    <CursorContext.Provider
      value={{
        cursorType,
        cursorText,
        setCursor,
        resetCursor,
      }}
    >
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor() {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error("useCursor must be used within a CursorProvider");
  }
  return context;
}

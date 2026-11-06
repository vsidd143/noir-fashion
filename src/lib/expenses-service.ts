/**
 * NOIR Luxury Atelier - Operating Expenses Management Service
 * Full Supabase database integration with local storage fallback
 */

import { supabase } from "./supabase";
import { OperatingExpense, OperatingExpenseCategory } from "@/types/analytics";

const LOCAL_EXPENSES_KEY = "noir_operating_expenses";

/**
 * Fetches all operating expenses from Supabase (or local storage fallback)
 */
export async function fetchOperatingExpenses(): Promise<OperatingExpense[]> {
  let remoteList: OperatingExpense[] = [];

  try {
    const { data, error } = await supabase
      .from("operating_expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (!error && data && data.length > 0) {
      remoteList = data as OperatingExpense[];
    }
  } catch (err) {
    console.warn("fetchOperatingExpenses note:", err);
  }

  let localList: OperatingExpense[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_EXPENSES_KEY);
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch {}
  }

  if (remoteList.length > 0) {
    const remoteIds = new Set(remoteList.map((e) => e.id));
    const merged = [...remoteList, ...localList.filter((l) => !remoteIds.has(l.id))];
    return merged;
  }

  return localList;
}

/**
 * Creates an operating expense record in Supabase and syncs locally
 */
export async function createOperatingExpense(expense: {
  title: string;
  category: OperatingExpenseCategory;
  amount: number;
  expense_date: string;
  notes?: string;
}): Promise<{ success: boolean; data?: OperatingExpense; error?: string }> {
  const newRecord: OperatingExpense = {
    id: "exp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    title: expense.title.trim(),
    category: expense.category,
    amount: Number(expense.amount),
    expense_date: expense.expense_date,
    notes: expense.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  // Sync locally first
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_EXPENSES_KEY);
      const list: OperatingExpense[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify([newRecord, ...list]));
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from("operating_expenses")
      .insert({
        title: newRecord.title,
        category: newRecord.category,
        amount: newRecord.amount,
        expense_date: newRecord.expense_date,
        notes: newRecord.notes,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      return { success: true, data: data as OperatingExpense };
    }
  } catch (err: unknown) {
    console.warn("createOperatingExpense note:", err);
  }

  return { success: true, data: newRecord };
}

/**
 * Deletes an operating expense record
 */
export async function deleteOperatingExpense(id: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_EXPENSES_KEY);
      if (stored) {
        const list: OperatingExpense[] = JSON.parse(stored);
        localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(list.filter((e) => e.id !== id)));
      }
    } catch {}
  }

  try {
    const { error } = await supabase.from("operating_expenses").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete expense" };
  }
}


import { createClient } from "@supabase/supabase-js";
import type { Lead, LeadInput } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const configured = Boolean(
  url &&
  /^https:\/\//.test(url) &&
  !url.includes("YOUR_PROJECT") &&
  key &&
  !key.includes("YOUR_PUBLIC"),
);
export const supabase = configured ? createClient(url!, key!) : null;
export async function listLeads(): Promise<Lead[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const all: Lead[] = [];
  // A conservative page size avoids the default API row cap. Never silently truncate counts.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    all.push(...(data as Lead[]));
    if (data.length < 500) break;
  }
  return all;
}
export async function saveLead(
  input: LeadInput,
  userId: string,
  id?: string,
): Promise<Lead> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const request = id
    ? supabase.from("leads").update(input).eq("id", id)
    : supabase.from("leads").insert({ ...input, user_id: userId });
  const { data, error } = await request.select().single();
  if (error) throw error;
  return data as Lead;
}
export async function removeLead(id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length)
    throw new Error(
      "Lead no longer exists or you do not have access. Refresh and try again.",
    );
}

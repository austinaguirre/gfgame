import bcrypt from "bcryptjs";
import { supabase, type UserRow } from "./supabase";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, password_hash, admin, is_active, created_at")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return data as UserRow;
}

export async function getUserById(id: string): Promise<Pick<UserRow, "id" | "username" | "admin" | "is_active"> | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, admin, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Pick<UserRow, "id" | "username" | "admin" | "is_active">;
}

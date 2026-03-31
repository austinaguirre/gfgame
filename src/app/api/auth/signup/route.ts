import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    if (username.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);
    const { error } = await supabase.from("users").insert({
      username: username.toLowerCase(),
      password_hash,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: "Sign up failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sign up failed" }, { status: 500 });
  }
}

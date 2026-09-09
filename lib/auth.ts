import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@prisma/client";

export interface CurrentUser {
  id: string; // Supabase auth id == Profile.id
  email: string;
  fullName: string | null;
  role: AppRole;
  employeeId: string | null;
  employeeName: string | null;
  employeeTeam: "HR" | "RECRUITMENT" | null;
}

/**
 * Resolves the signed-in Supabase user to their Profile row. Returns null if
 * there's no session, or if the session's Profile row has gone missing (e.g.
 * deleted by an admin) — callers decide whether that means "send to /login" or
 * "send to /not-authorized".
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { employee: true },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    employeeId: profile.employeeId,
    employeeName: profile.employee?.name ?? null,
    employeeTeam: profile.employee?.team ?? null,
  };
}

/** For use at the top of protected Server Components/Pages. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/not-authorized");
  return user;
}

export async function requireRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

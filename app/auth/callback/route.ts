import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Google OAuth redirect target. Exchanges the auth code for a session, then
 * enforces the invite-only gate: a Profile is only ever created here, and only
 * for an email that matches an existing, active Employee. Everyone else is
 * signed back out and sent to /not-authorized — there is no self-serve sign-up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    console.error("Supabase exchangeCodeForSession failed:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { id: authId, email } = data.user;

  const employee = await prisma.employee.findUnique({
    where: { email, active: true },
  });

  if (!employee) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/not-authorized`);
  }

  await prisma.profile.upsert({
    where: { id: authId },
    create: {
      id: authId,
      email,
      fullName: data.user.user_metadata?.full_name ?? null,
      employeeId: employee.id,
      lastLoginAt: new Date(),
      // role defaults to VIEWER — an ADMIN promotes the person afterwards.
    },
    update: {
      employeeId: employee.id,
      lastLoginAt: new Date(),
    },
  });

  return NextResponse.redirect(`${origin}${redirectTo}`);
}

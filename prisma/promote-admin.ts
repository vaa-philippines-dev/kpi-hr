/**
 * One-time bootstrap helper: promotes an already-logged-in user's Profile to
 * ADMIN. Needed because the very first admin can't be pre-provisioned with a
 * Profile row (Profile.id must equal their Supabase auth id, which doesn't
 * exist until they've signed in with Google at least once).
 *
 * Usage: npm run promote-admin -- someone@example.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run promote-admin -- <email>");
    process.exit(1);
  }

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) {
    console.error(
      `No Profile found for ${email}. They must sign in with Google at least once first.`
    );
    process.exit(1);
  }

  await prisma.profile.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`Promoted ${email} to ADMIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

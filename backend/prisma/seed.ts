import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real hostel names for this campus deployment. Add more here and re-run
// `npm run prisma:seed` (upsert is idempotent, safe to re-run any time).
const HOSTELS = ["Aquamarine A", "Aquamarine B"];

async function main() {
  for (const name of HOSTELS) {
    await prisma.hostel.upsert({ where: { name }, create: { name }, update: {} });
  }
  console.log(`Seeded ${HOSTELS.length} hostels.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

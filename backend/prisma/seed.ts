import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOSTELS = ["Hostel 1", "Hostel 2", "Hostel 3", "Hostel 5", "Hostel 7"];

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

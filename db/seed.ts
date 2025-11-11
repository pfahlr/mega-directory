import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.category.createMany({
    data: [
      { name: "Real Estate", slug: "real-estate" },
      { name: "Jobs", slug: "jobs" }
    ]
  })

  await prisma.location.createMany({
    data: [
      { name: "New York", slug: "new-york" },
      { name: "San Francisco", slug: "san-francisco" }
    ]
  })
}

main().finally(() => prisma.$disconnect())

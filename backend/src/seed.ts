import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // users - seeded with known passwords for testing
  const users = [
    { email: 'admin@example.com', name: 'Admin', role: 'ADMIN', password: 'Password123!' },
    { email: 'engineer@example.com', name: 'Engineer', role: 'ENGINEER', password: 'Password123!' },
    { email: 'viewer@example.com', name: 'Viewer', role: 'VIEWER', password: 'Password123!' },
  ] as const;

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, role: u.role as Role, name: u.name },
      create: { email: u.email, passwordHash: hash, role: u.role as Role, name: u.name },
    });
  }

  // sample turbine
  const t = await prisma.turbine.upsert({
    where: { id: 'seed-turbine' },
    update: {},
    create: { id: 'seed-turbine', name: 'T-1000', manufacturer: 'SkyGen', mwRating: 2.5, lat: 12.98, lng: 77.59 },
  });

  console.log('Seeded. Turbine:', t.name);
}

main().finally(() => prisma.$disconnect());

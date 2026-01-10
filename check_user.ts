
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'dvirbenshlush95@gmail.com' },
    include: { apartments: true }
  });
  console.log('User:', user?.id, 'Email:', user?.email);
  console.log('Apartments count:', user?.apartments.length);
  if (user?.apartments) {
      user.apartments.forEach(a => console.log('Apt ID:', a.id, 'City:', a.city));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());

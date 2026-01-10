
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const userId = '9cdac0c3-0c90-43fb-b9fc-0634d5b3e94f';
  const meetings = await prisma.meeting.findMany({
      where: {
          lead: {
              apartment: {
                  userId: userId
              }
          }
      },
      include: {
          lead: {
              include: {
                  apartment: true
              }
          }
      }
  });
  console.log('Meetings found for user:', meetings.length);
  meetings.forEach(m => console.log('Meeting:', m.id, 'Status:', m.status, 'Start:', m.startTime));
}

check().catch(console.error).finally(() => prisma.$disconnect());

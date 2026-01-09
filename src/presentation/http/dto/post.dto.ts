// DTOs for Post operations
import { PostPlatform } from '@prisma/client';

export class GeneratePostDto {
  apartmentId: string;
  platform: PostPlatform;
  tone?: 'professional' | 'casual' | 'friendly';
  includeEmojis?: boolean;
}

export class PostResponseDto {
  id: string;
  apartmentId: string;
  userId: string;
  content: string;
  platform: PostPlatform;
  publishedAt?: Date;
  createdAt: Date;
}

export class PublishPostDto {
  platform?: PostPlatform; // אם לא צוין, ישתמש בפלטפורמה של הפוסט
}

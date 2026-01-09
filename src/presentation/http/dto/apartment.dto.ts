// DTOs for Apartment operations
export interface TimeSlot {
  start: string; // ISO 8601 format
  end: string;   // ISO 8601 format
}

export class CreateApartmentDto {
  city: string;
  price: number;
  rooms: number;
  description?: string;
  address?: string;
  images?: string[];
  videoUrl?: string;
  calendarLink?: string;
  availability?: TimeSlot[];
}

export class UpdateApartmentDto {
  price?: number;
  description?: string;
  address?: string;
  availability?: TimeSlot[];
  images?: string[];
  videoUrl?: string;
  calendarLink?: string;
}

export class ApartmentResponseDto {
  id: string;
  city: string;
  price: number;
  rooms: number;
  description?: string;
  address?: string;
  images: string[];
  videoUrl?: string;
  calendarLink?: string;
  availability?: TimeSlot[];
  createdAt: Date;
  userId?: string;
}

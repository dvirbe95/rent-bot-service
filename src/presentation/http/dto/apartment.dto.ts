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
  floor?: number;
  sqm?: number;
  arnona?: number;
  vaadBayit?: number;
  collateral?: string;
  priceFlexibility?: boolean;
  entryDate?: string;
  balcony?: boolean;
  shelter?: boolean;
  mamad?: boolean;
  furnished?: boolean;
  petsAllowed?: boolean;
  parking?: boolean;
  elevator?: boolean;
  nearbyConstruction?: boolean;
  neighbors?: string;
  commercialCenter?: string;
  schools?: string;
  entertainmentAreas?: string;
  contactPhone?: string;
  images?: string[];
  documents?: string[];
  videoUrl?: string;
  availability?: TimeSlot[];
}

export interface UpdateApartmentDto extends Partial<CreateApartmentDto> {}

export class ApartmentResponseDto {
  id: string;
  city: string;
  price: number;
  rooms: number;
  description?: string;
  address?: string;
  floor?: number;
  sqm?: number;
  arnona?: number;
  vaadBayit?: number;
  collateral?: string;
  priceFlexibility: boolean;
  entryDate?: Date;
  balcony: boolean;
  shelter: boolean;
  mamad: boolean;
  furnished: boolean;
  petsAllowed: boolean;
  parking: boolean;
  elevator: boolean;
  nearbyConstruction: boolean;
  neighbors?: string;
  commercialCenter?: string;
  schools?: string;
  entertainmentAreas?: string;
  contactPhone?: string;
  images: string[];
  documents: string[];
  videoUrl?: string;
  availability?: TimeSlot[];
  createdAt: Date;
  userId?: string;
}

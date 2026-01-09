// DTOs for Client Lead operations
import { LeadStatus, SenderType } from '@prisma/client';

export class ClientLeadResponseDto {
  id: string;
  apartmentId: string;
  tenantChatId: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  status: LeadStatus;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class LeadMessageResponseDto {
  id: string;
  leadId: string;
  senderType: SenderType;
  content: string;
  timestamp: Date;
}

export class LeadConversationResponseDto {
  lead: ClientLeadResponseDto;
  messages: LeadMessageResponseDto[];
}

export class UpdateLeadStatusDto {
  status: LeadStatus;
}

export class SendMessageToLeadDto {
  content: string;
}

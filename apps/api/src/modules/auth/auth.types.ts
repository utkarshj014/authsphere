import type { SecurityEventTypeName } from "@authsphere/shared";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SecurityEventResponseDto {
  id: string;
  type: SecurityEventTypeName;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface PaginatedSecurityEventsDto {
  events: SecurityEventResponseDto[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

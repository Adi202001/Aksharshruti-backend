// Standard API Response types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationMeta;
  meta?: Record<string, any>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any[];
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

// Common query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  language?: string;
  genre?: string;
  startDate?: string;
  endDate?: string;
}

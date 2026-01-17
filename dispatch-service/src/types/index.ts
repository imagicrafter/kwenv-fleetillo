/**
 * Type definitions for the Dispatch Service
 */

// Channel types supported by the dispatch service
export type ChannelType = 'telegram' | 'email' | 'sms' | 'push';

// Dispatch status values
export type DispatchStatus =
  | 'pending' // Created, not yet processed
  | 'sending' // Currently sending to channels
  | 'delivered' // At least one channel succeeded
  | 'partial' // Some channels succeeded, some failed
  | 'failed'; // All channels failed

// Channel dispatch status values
export type ChannelDispatchStatus =
  | 'pending' // Not yet attempted
  | 'sending' // Currently sending
  | 'delivered' // Successfully delivered
  | 'failed'; // Delivery failed

// Dispatch entity
export interface Dispatch {
  id: string;
  routeId: string;
  driverId: string;
  status: DispatchStatus;
  requestedChannels: ChannelType[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Channel dispatch entity
export interface ChannelDispatch {
  id: string;
  dispatchId: string;
  channel: ChannelType;
  status: ChannelDispatchStatus;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Database row types (snake_case)
export interface DispatchRow {
  id: string;
  route_id: string;
  driver_id: string;
  status: DispatchStatus;
  requested_channels: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelDispatchRow {
  id: string;
  dispatch_id: string;
  channel: string;
  status: ChannelDispatchStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

// Driver entity (from main OptiRoute app)
export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  telegramChatId?: string;
  preferredChannel?: ChannelType;
  fallbackEnabled: boolean;
  status: 'active' | 'inactive';
}

// Route entity (from main OptiRoute app)
export interface Route {
  id: string;
  name: string;
  code?: string;
  date: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  totalStops: number;
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  vehicleId?: string;
  driverId?: string;
}

// Vehicle entity (from main OptiRoute app)
export interface Vehicle {
  id: string;
  name: string;
  licensePlate?: string;
  make?: string;
  model?: string;
}

// Booking entity (from main OptiRoute app)
export interface Booking {
  id: string;
  routeId: string;
  stopNumber: number;
  clientName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  scheduledTime?: string;
  services?: string;
  specialInstructions?: string;
}

// API Request/Response types
export interface SingleDispatchBody {
  route_id: string;
  driver_id: string;
  channels?: ChannelType[];
  multi_channel?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BatchDispatchBody {
  dispatches: SingleDispatchBody[];
}

export interface DispatchResponse {
  dispatchId: string;
  status: DispatchStatus;
  requestedChannels: ChannelType[];
}

export interface BatchDispatchResponse {
  results: Array<{
    index: number;
    success: boolean;
    dispatchId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface DispatchDetailResponse {
  id: string;
  route_id: string;
  driver_id: string;
  status: DispatchStatus;
  requested_channels: ChannelType[];
  channel_dispatches: Array<{
    channel: ChannelType;
    status: ChannelDispatchStatus;
    provider_message_id?: string;
    error_message?: string;
    sent_at?: string;
    delivered_at?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    telegram: { status: 'up' | 'down' | 'unconfigured' };
    email: { status: 'up' | 'down' | 'unconfigured' };
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}

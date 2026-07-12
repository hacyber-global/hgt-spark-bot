export type GigPlatform = 'Spark' | 'Instacart' | 'DoorDash' | 'Amazon Flex' | 'Uber Eats' | 'Shipt' | 'Roadie' | 'Bungii' | 'GoShare' | 'Lyft';

export type SparkOrderType = 
  | 'Shop & Deliver' | 'Curbside Pickup' | 'Dotcom Delivery' // Spark
  | 'Full Service' | 'Delivery Only' | 'Shop & Bag' // Instacart
  | 'Restaurant Delivery' | 'Shop & Deliver (DD)' | 'DashMart Pack' // DoorDash
  | 'Logistics Block' | 'Prime Now Block' | 'Whole Foods Block' // Amazon Flex
  | 'UberX Ride' | 'Food Courier' | 'Uber Connect' // Uber
  | 'Shipt Shop & Deliver' | 'Shipt Delivery Only' // Shipt
  | 'Roadie Gig' | 'Home Depot Delivery' // Roadie
  | 'Bungii Large Load' | 'Bungii XL Cargo' // Bungii
  | 'GoShare LTL Freight' | 'GoShare Helper Run' // GoShare
  | 'Lyft Passenger Trip' | 'Lyft XL Ride'; // Lyft

export interface SparkOffer {
  id: string;
  storeNumber: string;
  storeName: string;
  type: SparkOrderType;
  basePay: number;
  tip: number;
  distance: number;
  itemsCount: number;
  totalPay: number;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  acceptedBy?: 'bot' | 'manual' | 'competitor';
  acceptTimeMs?: number;
  platform: GigPlatform; // Multi-gig platform differentiator
}

export interface BotFilters {
  isEnabled: boolean;
  minTotalPay: number;
  maxDistance: number;
  minPayPerMile: number;
  shopAndDeliver: boolean;
  curbsidePickup: boolean;
  dotcomDelivery: boolean;
  reactionSpeedMs: number; // reaction delay
  audioEnabled: boolean;
  activePlatforms: GigPlatform[]; // Selected active tappers
  blacklistedStoreNumbers: string[]; // Blacklisted walmart/store IDs
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'bot_accept' | 'bot_skip' | 'manual_accept' | 'manual_decline' | 'expire' | 'warning' | 'competitor';
  message: string;
  offerId?: string;
  badge?: string;
}

export interface DashboardMetrics {
  totalEarnings: number;
  basePayTotal: number;
  tipTotal: number;
  tripsCompleted: number;
  tripsExpiredCount: number;
  tripsDeclinedCount: number;
  totalMilesDriven: number;
  riskLevel: number; // 0 to 100% (bot detection danger)
  botInterceptCount: number;
}

export interface TableConfig {
  id: string;
  name: string;
  type: 'public' | 'private';
  entryFee: number;
  bootAmount: number;
  maxBetLimit: number; // Pot limit or chaal limit
  minBalanceToSit: number;
  maxPlayers: number; // Fixed number of chairs
  minPlayers: number; // Minimum players to start
  description: string; // For lobby display
  tier: 'low' | 'medium' | 'high'; // Bet level tier
}

export const TABLE_TYPES: TableConfig[] = [
  {
    id: 'starter_table',
    name: 'Starter Table',
    type: 'public',
    tier: 'low',
    entryFee: 100,
    minBalanceToSit: 100,
    bootAmount: 10,
    maxBetLimit: 1000,
    maxPlayers: 5,
    minPlayers: 2,
    description: 'Perfect for beginners. Low stakes, learn the game!'
  },
  {
    id: 'pro_table',
    name: 'Pro Table',
    type: 'public',
    tier: 'medium',
    entryFee: 1000,
    minBalanceToSit: 1000,
    bootAmount: 100,
    maxBetLimit: 10000,
    maxPlayers: 5,
    minPlayers: 2,
    description: 'For experienced players. Medium stakes, serious play.'
  },
  {
    id: 'vip_table',
    name: 'VIP Table',
    type: 'public',
    tier: 'high',
    entryFee: 5000,
    minBalanceToSit: 5000,
    bootAmount: 500,
    maxBetLimit: 50000,
    maxPlayers: 5,
    minPlayers: 2,
    description: 'High rollers only. Maximum stakes, maximum rewards!'
  }
];

// Helper function to check if user is eligible for a table
export const isEligibleForTable = (userBalance: number, tableConfig: TableConfig): boolean => {
  return userBalance >= tableConfig.minBalanceToSit;
};

// Helper function to get table by ID
export const getTableConfigById = (tableId: string): TableConfig | undefined => {
  return TABLE_TYPES.find(t => t.id === tableId);
};

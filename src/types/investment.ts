// Core types for Investment Control Center

export type ConnectionType = 'mssql' | 'postgresql';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  schema?: string;
  username: string;
  status: 'ok' | 'warning' | 'error' | 'disconnected' | 'paused';
  lastSuccess?: Date;
  lastError?: string;
  latencyMs?: number;
}

export interface ColumnMapping {
  id: string;
  semanticField: string;
  connectionId: string;
  schema: string;
  table: string;
  column: string;
  dataType: 'date' | 'datetime' | 'numeric' | 'text' | 'boolean';
  isValid: boolean;
  sampleValue?: string;
  nullRate?: number;
}

export interface NAVRecord {
  date: Date;
  total: number;
  cash: number;
  securities: number;
  options: number;
}

export interface PortfolioPosition {
  id: string;
  date: Date;
  symbol: string;
  description: string;
  type: 'Stocks' | 'Options';
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  sector?: string;
}

export interface RollHistoryEntry {
  rollDate: Date;
  fromSymbol: string;
  toSymbol: string;
  fromStrike: number;
  toStrike: number;
  fromExpiry: Date;
  toExpiry: Date;
  credit: number;      // Net credit/debit from the roll
  realizedPL: number;  // P/L from closing the old leg
}

export interface OptionPosition extends PortfolioPosition {
  underlying: string;
  expDate: Date;
  strike: number;
  putCall: 'PUT' | 'CALL';
  dte: number;
  multiplier: number;
  capitalAtRisk: number;
  premiumCollectedToDate: number;
  premiumCollectedPct: number;
  premiumRemaining: number;
  premiumRemainingPct: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
  isItm: boolean;
  // Roll tracking
  isRolled: boolean;
  rollCount: number;           // How many times this position has been rolled
  rollHistory: RollHistoryEntry[];  // History of all rolls
  totalRollCredits: number;    // Sum of all roll credits
  totalRealizedPL: number;     // Sum of all realized P/L from rolls
  breakEvenPrice: number;      // Price where position breaks even (considering all roll credits)
  rollGroupId?: string;
  rollCredit?: number;
  additionalProfit?: number;
}

export interface StockPosition extends PortfolioPosition {
  weightInPortfolio: number;
}

export interface Trade {
  id: string;
  tradeId: string;
  date: Date;
  time: string;
  timestamp: Date;
  symbol: string;
  description: string;
  quantity: number;
  price: number;
  proceeds: number;
  fees: number;
  assetType: 'OPTION' | 'STOCK';
  direction: 'BUY' | 'SELL';
  underlying?: string;
}

export interface RollGroup {
  id: string;
  timestamp: Date;
  underlying: string;
  rollType: 'option' | 'stock_repair';
  legs: Trade[];
  rollCredit: number;
  additionalProfit: number;
  closingSymbol: string;
  openingSymbol: string;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface RiskMetrics {
  date: Date;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  var95: number;
}

export interface PerformanceRecord {
  date: Date;
  period: 'daily' | 'monthly' | 'quarterly' | 'yearly';
  return: number;
  cumulativeReturn: number;
  benchmarkReturn?: number;
}

export interface KPIData {
  navTotal: number;
  navChange: number;
  navChangePct: number;
  capitalAtRisk: number;
  capitalAtRiskPct: number;
  monthlyPremium: number;
  monthlyPremiumROI: number;
  ytdPremium: number;
  avgDelta: number;
  dataFreshness: Date;
  connectionStatus: 'ok' | 'partial' | 'error';
}

export interface ExpiryGroup {
  expDate: Date;
  dte: number;
  positions: OptionPosition[];
  totalCapitalAtRisk: number;
  totalPremiumCollected: number;
  totalDelta: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  positions: number;
}

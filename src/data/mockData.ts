import { 
  KPIData, 
  NAVRecord, 
  OptionPosition, 
  StockPosition, 
  RiskMetrics,
  SectorAllocation,
  DatabaseConnection,
  ColumnMapping,
  PerformanceRecord
} from '@/types/investment';

// Generate dates for the last N days
const generateDates = (days: number): Date[] => {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
};

// NAV History
export const mockNAVHistory: NAVRecord[] = generateDates(90).map((date, i) => {
  const baseNav = 125000000;
  const trend = i * 150000;
  const volatility = (Math.random() - 0.5) * 2000000;
  const total = baseNav + trend + volatility;
  
  return {
    date,
    total,
    cash: total * 0.15,
    securities: total * 0.65,
    options: total * 0.20,
  };
});

// Current KPIs
export const mockKPIData: KPIData = {
  navTotal: mockNAVHistory[mockNAVHistory.length - 1].total,
  navChange: 1250000,
  navChangePct: 1.02,
  capitalAtRisk: 42500000,
  capitalAtRiskPct: 33.8,
  monthlyPremium: 1850000,
  monthlyPremiumROI: 4.35,
  ytdPremium: 18500000,
  avgDelta: -0.18,
  dataFreshness: new Date(),
  connectionStatus: 'ok',
};

// Generate option positions
const underlyings = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'BAC', 'WMT'];
const generateExpDate = (daysAhead: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  // Move to Friday
  const day = date.getDay();
  const diff = day <= 5 ? 5 - day : 0;
  date.setDate(date.getDate() + diff);
  return date;
};

const expiryDates = [7, 14, 21, 35, 49, 63, 90].map(d => generateExpDate(d));

export const mockPutPositions: OptionPosition[] = underlyings.flatMap((underlying, idx) => {
  const positions: OptionPosition[] = [];
  const numPositions = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < numPositions; i++) {
    const expDate = expiryDates[Math.floor(Math.random() * expiryDates.length)];
    const dte = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const strike = Math.round((150 + Math.random() * 100) / 5) * 5;
    const contracts = -(Math.floor(Math.random() * 50) + 10);
    const multiplier = 100;
    const capitalAtRisk = strike * multiplier * Math.abs(contracts);
    const premiumCollected = capitalAtRisk * (0.02 + Math.random() * 0.03);
    const currentValue = premiumCollected * (0.3 + Math.random() * 0.5);
    
    positions.push({
      id: `put-${underlying}-${i}`,
      date: new Date(),
      symbol: `${underlying}${expDate.toISOString().slice(2, 10).replace(/-/g, '')}P${strike.toString().padStart(5, '0')}000`,
      description: `${underlying} ${expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase().replace(/ /g, '')} ${strike} P`,
      type: 'Options',
      quantity: contracts,
      marketValue: -currentValue,
      costBasis: -premiumCollected,
      unrealizedPL: premiumCollected - currentValue,
      underlying,
      expDate,
      strike,
      putCall: 'PUT',
      dte,
      multiplier,
      capitalAtRisk,
      premiumCollectedToDate: premiumCollected - currentValue,
      premiumCollectedPct: ((premiumCollected - currentValue) / premiumCollected) * 100,
      premiumRemaining: currentValue,
      premiumRemainingPct: (currentValue / premiumCollected) * 100,
      delta: -(0.15 + Math.random() * 0.25),
      gamma: 0.01 + Math.random() * 0.02,
      theta: -(50 + Math.random() * 150) * Math.abs(contracts),
      vega: (100 + Math.random() * 200) * Math.abs(contracts),
      iv: 0.2 + Math.random() * 0.3,
      isItm: Math.random() < 0.1,
      isRolled: Math.random() < 0.2,
      rollGroupId: Math.random() < 0.2 ? `roll-${Date.now()}-${idx}` : undefined,
      rollCredit: Math.random() < 0.2 ? 5000 + Math.random() * 15000 : undefined,
    });
  }
  return positions;
});

export const mockCallPositions: OptionPosition[] = underlyings.slice(0, 6).flatMap((underlying, idx) => {
  const positions: OptionPosition[] = [];
  const numPositions = Math.floor(Math.random() * 2) + 1;
  
  for (let i = 0; i < numPositions; i++) {
    const expDate = expiryDates[Math.floor(Math.random() * expiryDates.length)];
    const dte = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const strike = Math.round((180 + Math.random() * 80) / 5) * 5;
    const contracts = -(Math.floor(Math.random() * 30) + 5);
    const multiplier = 100;
    
    // Calls are mostly covered
    const coveredContracts = Math.floor(Math.abs(contracts) * 0.8);
    const uncoveredContracts = Math.abs(contracts) - coveredContracts;
    const capitalAtRisk = strike * multiplier * uncoveredContracts;
    
    const premiumCollected = Math.abs(contracts) * multiplier * strike * 0.015;
    const currentValue = premiumCollected * (0.2 + Math.random() * 0.4);
    
    positions.push({
      id: `call-${underlying}-${i}`,
      date: new Date(),
      symbol: `${underlying}${expDate.toISOString().slice(2, 10).replace(/-/g, '')}C${strike.toString().padStart(5, '0')}000`,
      description: `${underlying} ${expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase().replace(/ /g, '')} ${strike} C`,
      type: 'Options',
      quantity: contracts,
      marketValue: -currentValue,
      costBasis: -premiumCollected,
      unrealizedPL: premiumCollected - currentValue,
      underlying,
      expDate,
      strike,
      putCall: 'CALL',
      dte,
      multiplier,
      capitalAtRisk,
      premiumCollectedToDate: premiumCollected - currentValue,
      premiumCollectedPct: ((premiumCollected - currentValue) / premiumCollected) * 100,
      premiumRemaining: currentValue,
      premiumRemainingPct: (currentValue / premiumCollected) * 100,
      delta: 0.1 + Math.random() * 0.2,
      gamma: 0.01 + Math.random() * 0.015,
      theta: -(30 + Math.random() * 100) * Math.abs(contracts),
      vega: (80 + Math.random() * 150) * Math.abs(contracts),
      iv: 0.18 + Math.random() * 0.25,
      isItm: Math.random() < 0.05,
      isRolled: false,
    });
  }
  return positions;
});

// Stock positions
export const mockStockPositions: StockPosition[] = underlyings.slice(0, 8).map((symbol, idx) => {
  const quantity = (Math.floor(Math.random() * 50) + 10) * 100;
  const avgPrice = 100 + Math.random() * 150;
  const currentPrice = avgPrice * (0.9 + Math.random() * 0.25);
  const marketValue = quantity * currentPrice;
  const costBasis = quantity * avgPrice;
  
  return {
    id: `stock-${symbol}`,
    date: new Date(),
    symbol,
    description: `${symbol} Common Stock`,
    type: 'Stocks',
    quantity,
    marketValue,
    costBasis,
    unrealizedPL: marketValue - costBasis,
    sector: ['Technology', 'Financials', 'Consumer', 'Healthcare', 'Energy'][idx % 5],
    weightInPortfolio: 0, // Will be calculated
  };
});

// Calculate weights
const totalStockValue = mockStockPositions.reduce((sum, s) => sum + s.marketValue, 0);
mockStockPositions.forEach(s => {
  s.weightInPortfolio = (s.marketValue / totalStockValue) * 100;
});

// Sector allocation
export const mockSectorAllocation: SectorAllocation[] = [
  { sector: 'Technology', value: 45000000, percentage: 35.2, positions: 12 },
  { sector: 'Financials', value: 28000000, percentage: 21.9, positions: 8 },
  { sector: 'Consumer', value: 22000000, percentage: 17.2, positions: 6 },
  { sector: 'Healthcare', value: 18000000, percentage: 14.1, positions: 5 },
  { sector: 'Energy', value: 15000000, percentage: 11.7, positions: 4 },
];

// Monthly premium data
export const mockMonthlyPremium = [
  { month: 'Jul 24', premium: 1650000, capitalAtRisk: 38000000 },
  { month: 'Aug 24', premium: 1720000, capitalAtRisk: 40000000 },
  { month: 'Sep 24', premium: 1580000, capitalAtRisk: 39000000 },
  { month: 'Oct 24', premium: 1890000, capitalAtRisk: 41000000 },
  { month: 'Nov 24', premium: 1750000, capitalAtRisk: 42000000 },
  { month: 'Dec 24', premium: 1920000, capitalAtRisk: 43000000 },
  { month: 'Jan 25', premium: 1850000, capitalAtRisk: 42500000 },
];

// Performance data
export const mockPerformance: PerformanceRecord[] = generateDates(365).map((date, i) => ({
  date,
  period: 'daily',
  return: (Math.random() - 0.48) * 0.02,
  cumulativeReturn: 0.12 + (i / 365) * 0.08 + (Math.random() - 0.5) * 0.02,
  benchmarkReturn: 0.10 + (i / 365) * 0.06,
}));

// Risk metrics
export const mockRiskMetrics: RiskMetrics = {
  date: new Date(),
  sharpeRatio: 1.85,
  sortinoRatio: 2.12,
  maxDrawdown: -0.082,
  volatility: 0.12,
  beta: 0.35,
  var95: -1250000,
};

// Database connections
export const mockConnections: DatabaseConnection[] = [
  {
    id: 'conn-1',
    name: 'Primary Trading DB',
    type: 'mssql',
    host: '192.168.1.100',
    port: 1433,
    database: 'TradingDB',
    schema: 'dbo',
    username: 'trading_reader',
    status: 'ok',
    lastSuccess: new Date(),
    latencyMs: 45,
  },
  {
    id: 'conn-2',
    name: 'Analytics PostgreSQL',
    type: 'postgresql',
    host: '192.168.1.101',
    port: 5432,
    database: 'analytics',
    schema: 'public',
    username: 'analytics_user',
    status: 'ok',
    lastSuccess: new Date(),
    latencyMs: 32,
  },
];

// Column mappings
export const mockMappings: ColumnMapping[] = [
  {
    id: 'map-1',
    semanticField: 'nav.total',
    connectionId: 'conn-1',
    schema: 'dbo',
    table: 'nav',
    column: 'total_value',
    dataType: 'numeric',
    isValid: true,
    sampleValue: '125,450,000.00',
    nullRate: 0,
  },
  {
    id: 'map-2',
    semanticField: 'portfolio_positions.symbol',
    connectionId: 'conn-1',
    schema: 'dbo',
    table: 'portfolio_positions',
    column: 'security_symbol',
    dataType: 'text',
    isValid: true,
    sampleValue: 'AAPL240119P00180000',
    nullRate: 0,
  },
  {
    id: 'map-3',
    semanticField: 'trades.timestamp',
    connectionId: 'conn-2',
    schema: 'public',
    table: 'trade_log',
    column: 'executed_at',
    dataType: 'datetime',
    isValid: true,
    sampleValue: '2025-01-15 14:32:45',
    nullRate: 0.01,
  },
];

// VIX data for risk tab
export const mockVIXData = generateDates(90).map((date, i) => ({
  date,
  vix: 14 + Math.random() * 12 + (i % 20 < 5 ? 8 : 0),
  portfolioVega: 250000 + Math.random() * 100000,
}));

// Greeks time series
export const mockGreeksHistory = generateDates(30).map((date) => ({
  date,
  delta: -0.15 - Math.random() * 0.1,
  gamma: 0.02 + Math.random() * 0.01,
  theta: -45000 - Math.random() * 15000,
  vega: 280000 + Math.random() * 80000,
}));

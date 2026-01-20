import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, Filter, Download, ArrowUpDown, RefreshCw, Info } from 'lucide-react';
import { OptionPosition } from '@/types/investment';
import { mockPutPositions, mockCallPositions } from '@/data/mockData';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  formatExpiry, 
  getDTELabel,
  getValueClass,
  formatDateShort
} from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OptionsTableProps {
  positions: OptionPosition[];
  title: string;
}

function OptionsTable({ positions, title }: OptionsTableProps) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('dte');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Filter positions
  const filtered = useMemo(() => {
    if (!search) return positions;
    const term = search.toLowerCase();
    return positions.filter(p => 
      p.underlying.toLowerCase().includes(term) ||
      p.symbol.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }, [positions, search]);

  // Group by expiry
  const grouped = useMemo(() => {
    const groups = new Map<string, OptionPosition[]>();
    
    filtered.forEach(pos => {
      const key = pos.expDate.toISOString().split('T')[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(pos);
    });

    // Sort groups by date
    const sortedEntries = Array.from(groups.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    // Sort positions within groups
    sortedEntries.forEach(([_, positions]) => {
      positions.sort((a, b) => {
        if (sortField === 'dte') return sortDir === 'asc' ? a.dte - b.dte : b.dte - a.dte;
        if (sortField === 'underlying') return sortDir === 'asc' 
          ? a.underlying.localeCompare(b.underlying) 
          : b.underlying.localeCompare(a.underlying);
        if (sortField === 'capitalAtRisk') return sortDir === 'asc' 
          ? a.capitalAtRisk - b.capitalAtRisk 
          : b.capitalAtRisk - a.capitalAtRisk;
        return 0;
      });
    });

    return sortedEntries;
  }, [filtered, sortField, sortDir]);

  // Initialize all groups as expanded
  useMemo(() => {
    const allKeys = new Set(grouped.map(([key]) => key));
    if (expandedGroups.size === 0 && allKeys.size > 0) {
      setExpandedGroups(allKeys);
    }
  }, [grouped]);

  const toggleGroup = (key: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedGroups(newSet);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Calculate totals
  const totals = useMemo(() => ({
    positions: filtered.length,
    capitalAtRisk: filtered.reduce((sum, p) => sum + p.capitalAtRisk, 0),
    premiumCollected: filtered.reduce((sum, p) => sum + p.premiumCollectedToDate, 0),
    unrealizedPL: filtered.reduce((sum, p) => sum + p.unrealizedPL, 0),
    delta: filtered.reduce((sum, p) => sum + (p.delta || 0) * Math.abs(p.quantity) * p.multiplier, 0),
    theta: filtered.reduce((sum, p) => sum + (p.theta || 0), 0),
  }), [filtered]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="secondary" className="font-mono">
            {filtered.length} positions
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search underlying, symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64 bg-surface-2 border-border"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Totals Bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-surface-2 border-b border-border text-sm">
        <div>
          <span className="text-muted-foreground">Capital at Risk: </span>
          <span className="font-mono font-medium">{formatCurrency(totals.capitalAtRisk, true)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Premium Collected: </span>
          <span className={cn("font-mono font-medium", getValueClass(totals.premiumCollected))}>
            {formatCurrency(totals.premiumCollected, true)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Unrealized P/L: </span>
          <span className={cn("font-mono font-medium", getValueClass(totals.unrealizedPL))}>
            {formatCurrency(totals.unrealizedPL, true)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Delta: </span>
          <span className="font-mono font-medium">{formatNumber(totals.delta, 0)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Daily Theta: </span>
          <span className={cn("font-mono font-medium", getValueClass(totals.theta))}>
            {formatCurrency(totals.theta)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th 
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('underlying')}
              >
                <span className="flex items-center gap-1">
                  Underlying
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th>Symbol</th>
              <th>Strike</th>
              <th 
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('dte')}
              >
                <span className="flex items-center gap-1">
                  DTE
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th>Qty</th>
              <th>Market Value</th>
              <th 
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('capitalAtRisk')}
              >
                <span className="flex items-center gap-1">
                  Capital at Risk
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th>Premium Collected</th>
              <th>Premium Remaining</th>
              <th>Unrealized P/L</th>
              <th>Delta</th>
              <th>Theta</th>
              <th>IV</th>
              <th>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 cursor-help">
                        Rolled
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">
                        Shows roll count, total credits collected, and minimum close price to break even
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
              <th>Break-Even</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([expKey, positions]) => {
              const isExpanded = expandedGroups.has(expKey);
              const expDate = new Date(expKey);
              const dte = positions[0]?.dte || 0;
              const groupRisk = positions.reduce((sum, p) => sum + p.capitalAtRisk, 0);
              const groupPremium = positions.reduce((sum, p) => sum + p.premiumCollectedToDate, 0);

              return (
                <>
                  {/* Group Header */}
                  <tr 
                    key={`group-${expKey}`}
                    className="group-header cursor-pointer"
                    onClick={() => toggleGroup(expKey)}
                  >
                    <td colSpan={16} className="!p-0">
                      <div className="flex items-center justify-between px-4 py-2 bg-surface-2 hover:bg-surface-3">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="font-medium">{formatExpiry(expDate)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getDTELabel(dte)}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            {positions.length} positions
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-muted-foreground">
                            Risk: <span className="font-mono text-foreground">{formatCurrency(groupRisk, true)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Premium: <span className={cn("font-mono", getValueClass(groupPremium))}>{formatCurrency(groupPremium, true)}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Position Rows */}
                  {isExpanded && positions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-surface-2">
                      <td></td>
                      <td className="font-medium">{pos.underlying}</td>
                      <td className="text-muted-foreground text-xs">{pos.description}</td>
                      <td>{formatNumber(pos.strike)}</td>
                      <td>
                        <span className={cn(
                          pos.dte <= 7 && "text-warning",
                          pos.dte <= 3 && "text-loss"
                        )}>
                          {pos.dte}d
                        </span>
                      </td>
                      <td>{pos.quantity}</td>
                      <td className={getValueClass(pos.marketValue)}>
                        {formatCurrency(pos.marketValue)}
                      </td>
                      <td>{formatCurrency(pos.capitalAtRisk, true)}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className={getValueClass(pos.premiumCollectedToDate)}>
                            {formatCurrency(pos.premiumCollectedToDate)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pos.premiumCollectedPct.toFixed(0)}% captured
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span>{formatCurrency(pos.premiumRemaining)}</span>
                          <span className="text-xs text-muted-foreground">
                            {pos.premiumRemainingPct.toFixed(0)}% left
                          </span>
                        </div>
                      </td>
                      <td className={getValueClass(pos.unrealizedPL)}>
                        {formatCurrency(pos.unrealizedPL)}
                      </td>
                      <td>{pos.delta?.toFixed(3) || '-'}</td>
                      <td className={getValueClass(pos.theta || 0)}>
                        {pos.theta ? formatCurrency(pos.theta) : '-'}
                      </td>
                      <td>{pos.iv ? `${(pos.iv * 100).toFixed(0)}%` : '-'}</td>
                      <td>
                        {pos.isRolled && pos.rollCount > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="inline-flex">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs text-primary border-primary cursor-pointer hover:bg-primary/10 flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  {pos.rollCount}x
                                </Badge>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="end">
                              <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-sm">Roll History</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {pos.rollCount} roll{pos.rollCount > 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                
                                {/* Roll Summary */}
                                <div className="grid grid-cols-2 gap-2 p-2 bg-surface-2 rounded-md text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Total Credits:</span>
                                    <span className={cn("ml-2 font-mono font-medium", getValueClass(pos.totalRollCredits))}>
                                      {formatCurrency(pos.totalRollCredits)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Realized P/L:</span>
                                    <span className={cn("ml-2 font-mono font-medium", getValueClass(pos.totalRealizedPL))}>
                                      {formatCurrency(pos.totalRealizedPL)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Break-even indicator */}
                                <div className="p-2 bg-primary/10 border border-primary/20 rounded-md">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Min Close Price:</span>
                                    <span className="font-mono font-bold text-primary">
                                      {formatNumber(pos.breakEvenPrice, 2)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {pos.putCall === 'PUT' 
                                      ? 'Close below this price to lock in profit from all rolls'
                                      : 'Close above this price to lock in profit from all rolls'}
                                  </p>
                                </div>
                                
                                {/* Roll entries */}
                                {pos.rollHistory.length > 0 && (
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    <div className="text-xs text-muted-foreground font-medium">Roll Details:</div>
                                    {pos.rollHistory.map((roll, idx) => (
                                      <div key={idx} className="text-xs p-2 bg-surface-3 rounded border border-border">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-muted-foreground">
                                            {formatDateShort(roll.rollDate)}
                                          </span>
                                          <span className={cn("font-mono", getValueClass(roll.credit))}>
                                            +{formatCurrency(roll.credit)}
                                          </span>
                                        </div>
                                        <div className="text-muted-foreground">
                                          {roll.fromSymbol} → {roll.toSymbol}
                                        </div>
                                        <div className="flex justify-between mt-1">
                                          <span>Strike: {roll.fromStrike} → {roll.toStrike}</span>
                                          <span className={cn("font-mono", getValueClass(roll.realizedPL))}>
                                            P/L: {formatCurrency(roll.realizedPL)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td>
                        {pos.isRolled && pos.rollCount > 0 ? (
                          <span className={cn(
                            "font-mono font-medium",
                            pos.putCall === 'PUT' 
                              ? pos.breakEvenPrice < pos.strike ? "text-gain" : "text-loss"
                              : pos.breakEvenPrice > pos.strike ? "text-gain" : "text-loss"
                          )}>
                            {formatNumber(pos.breakEvenPrice, 2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OptionsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'puts' | 'calls'>('puts');

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <button
          onClick={() => setActiveSubTab('puts')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeSubTab === 'puts'
              ? "bg-loss/20 text-loss"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
          )}
        >
          PUTS ({mockPutPositions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('calls')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeSubTab === 'calls'
              ? "bg-gain/20 text-gain"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
          )}
        >
          CALLS ({mockCallPositions.length})
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        {activeSubTab === 'puts' ? (
          <OptionsTable positions={mockPutPositions} title="Put Positions" />
        ) : (
          <OptionsTable positions={mockCallPositions} title="Call Positions" />
        )}
      </div>
    </div>
  );
}

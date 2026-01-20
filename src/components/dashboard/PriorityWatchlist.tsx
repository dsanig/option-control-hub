import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Target, ExternalLink } from 'lucide-react';
import { OptionPosition } from '@/types/investment';
import { formatCurrency, formatNumber, formatExpiry } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PriorityWatchlistProps {
  putPositions: OptionPosition[];
  callPositions: OptionPosition[];
}

// Mock current prices - in production, these would come from a market data API
const mockCurrentPrices: Record<string, number> = {
  'AAPL': 185.50,
  'MSFT': 415.20,
  'GOOGL': 175.80,
  'AMZN': 198.40,
  'META': 565.30,
  'NVDA': 875.60,
  'TSLA': 248.90,
  'JPM': 198.75,
  'BAC': 37.25,
  'WMT': 168.40,
};

interface PriorityOption {
  position: OptionPosition;
  currentPrice: number;
  distanceToStrike: number; // Percentage distance to strike
  distanceToStrikeAbs: number; // Absolute distance
  priorityScore: number; // Higher = more urgent
  reason: 'itm' | 'high_delta' | 'near_strike' | 'expiring_soon';
  reasonLabel: string;
}

export function PriorityWatchlist({ putPositions, callPositions }: PriorityWatchlistProps) {
  const priorityOptions = useMemo(() => {
    const allOptions = [...putPositions, ...callPositions];
    const prioritized: PriorityOption[] = [];

    allOptions.forEach(pos => {
      const currentPrice = mockCurrentPrices[pos.underlying] || pos.strike * 1.05;
      
      // Calculate distance to strike as percentage
      // For puts: ITM when price < strike, for calls: ITM when price > strike
      const isPut = pos.putCall === 'PUT';
      const distanceToStrike = isPut
        ? ((currentPrice - pos.strike) / pos.strike) * 100
        : ((pos.strike - currentPrice) / pos.strike) * 100;
      
      const distanceToStrikeAbs = Math.abs(currentPrice - pos.strike);
      
      // Determine if ITM
      const isITM = isPut ? currentPrice < pos.strike : currentPrice > pos.strike;
      
      // Calculate priority score (higher = more urgent)
      let priorityScore = 0;
      let reason: PriorityOption['reason'] = 'near_strike';
      let reasonLabel = '';

      // ITM positions are highest priority
      if (isITM) {
        const itmPercentage = Math.abs(distanceToStrike);
        priorityScore = 100 + itmPercentage * 2; // ITM gets 100+ base score
        reason = 'itm';
        reasonLabel = `ITM by ${itmPercentage.toFixed(1)}%`;
      }
      // High delta positions (absolute delta > 0.35)
      else if (Math.abs(pos.delta || 0) > 0.35) {
        priorityScore = 70 + Math.abs(pos.delta || 0) * 50;
        reason = 'high_delta';
        reasonLabel = `Delta ${(pos.delta || 0).toFixed(2)}`;
      }
      // Near strike (within 5%)
      else if (Math.abs(distanceToStrike) < 5) {
        priorityScore = 50 + (5 - Math.abs(distanceToStrike)) * 10;
        reason = 'near_strike';
        reasonLabel = `${Math.abs(distanceToStrike).toFixed(1)}% from strike`;
      }
      // Expiring soon with moderate delta
      else if (pos.dte <= 7 && Math.abs(pos.delta || 0) > 0.2) {
        priorityScore = 40 + (7 - pos.dte) * 5;
        reason = 'expiring_soon';
        reasonLabel = `${pos.dte}d to expiry`;
      }

      // Only add if there's a reason to watch
      if (priorityScore > 0) {
        prioritized.push({
          position: pos,
          currentPrice,
          distanceToStrike,
          distanceToStrikeAbs,
          priorityScore,
          reason,
          reasonLabel,
        });
      }
    });

    // Sort by priority score descending, take top 8
    return prioritized
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 8);
  }, [putPositions, callPositions]);

  const getReasonBadge = (item: PriorityOption) => {
    switch (item.reason) {
      case 'itm':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            ITM
          </Badge>
        );
      case 'high_delta':
        return (
          <Badge variant="outline" className="text-xs text-warning border-warning">
            <Target className="w-3 h-3 mr-1" />
            High Δ
          </Badge>
        );
      case 'near_strike':
        return (
          <Badge variant="outline" className="text-xs text-warning border-warning">
            Near Strike
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Expiring
          </Badge>
        );
    }
  };

  if (priorityOptions.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Priority Watchlist
        </h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No positions requiring immediate attention
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Priority Watchlist
          <Badge variant="secondary" className="text-xs ml-2">
            {priorityOptions.length} positions
          </Badge>
        </h3>
        <span className="text-xs text-muted-foreground">
          Prices updated: {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground text-xs">
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Underlying</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Strike</th>
              <th className="pb-2 font-medium">Current</th>
              <th className="pb-2 font-medium">Distance</th>
              <th className="pb-2 font-medium">DTE</th>
              <th className="pb-2 font-medium">Delta</th>
              <th className="pb-2 font-medium">Capital at Risk</th>
              <th className="pb-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {priorityOptions.map((item) => {
              const pos = item.position;
              const isPut = pos.putCall === 'PUT';
              
              return (
                <tr key={pos.id} className="hover:bg-surface-2">
                  <td className="py-2">
                    {getReasonBadge(item)}
                  </td>
                  <td className="py-2 font-medium">{pos.underlying}</td>
                  <td className="py-2">
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      isPut ? "bg-loss/20 text-loss" : "bg-gain/20 text-gain"
                    )}>
                      {pos.putCall}
                    </span>
                  </td>
                  <td className="py-2 font-mono">{formatNumber(pos.strike, 2)}</td>
                  <td className="py-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="font-mono flex items-center gap-1">
                          {formatNumber(item.currentPrice, 2)}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Market price (mock data)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      {item.distanceToStrike > 0 ? (
                        <TrendingUp className="w-3 h-3 text-gain" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-loss" />
                      )}
                      <span className={cn(
                        "font-mono text-xs",
                        item.reason === 'itm' ? "text-loss font-bold" : "text-foreground"
                      )}>
                        {item.distanceToStrike > 0 ? '+' : ''}{item.distanceToStrike.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2">
                    <span className={cn(
                      "font-mono",
                      pos.dte <= 7 && "text-warning",
                      pos.dte <= 3 && "text-loss font-bold"
                    )}>
                      {pos.dte}d
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={cn(
                      "font-mono",
                      Math.abs(pos.delta || 0) > 0.4 && "text-warning font-bold"
                    )}>
                      {(pos.delta || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-muted-foreground">
                    {formatCurrency(pos.capitalAtRisk, true)}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {item.reasonLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
        <div className="flex gap-4">
          <span className="text-muted-foreground">
            ITM: <span className="text-loss font-medium">
              {priorityOptions.filter(p => p.reason === 'itm').length}
            </span>
          </span>
          <span className="text-muted-foreground">
            High Delta: <span className="text-warning font-medium">
              {priorityOptions.filter(p => p.reason === 'high_delta').length}
            </span>
          </span>
          <span className="text-muted-foreground">
            Near Strike: <span className="font-medium">
              {priorityOptions.filter(p => p.reason === 'near_strike').length}
            </span>
          </span>
        </div>
        <span className="text-muted-foreground">
          Total Risk: <span className="font-mono font-medium text-foreground">
            {formatCurrency(priorityOptions.reduce((sum, p) => sum + p.position.capitalAtRisk, 0), true)}
          </span>
        </span>
      </div>
    </div>
  );
}
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  className?: string;
  size?: 'default' | 'large';
}

export function KPICard({ 
  label, 
  value, 
  change, 
  changeLabel,
  trend,
  icon,
  className,
  size = 'default'
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-gain" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-loss" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getChangeClass = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-gain';
    if (change < 0) return 'text-loss';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="kpi-label">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      
      <div className={cn(
        "kpi-value",
        size === 'large' && "text-3xl"
      )}>
        {value}
      </div>

      {(change !== undefined || changeLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {getTrendIcon()}
          {change !== undefined && (
            <span className={cn("text-sm font-mono", getChangeClass())}>
              {change > 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

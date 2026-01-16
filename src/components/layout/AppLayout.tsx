import { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  TrendingDown, 
  BarChart3, 
  Shield, 
  Settings,
  Database,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  connectionStatus: 'ok' | 'partial' | 'error';
  lastRefresh: Date;
  onRefresh: () => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'options', label: 'Options', icon: TrendingDown },
  { id: 'stocks', label: 'Stocks', icon: BarChart3 },
  { id: 'risk', label: 'Risk', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ 
  children, 
  activeTab, 
  onTabChange, 
  connectionStatus,
  lastRefresh,
  onRefresh 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-surface-1 border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">
                Investment Control Center
              </h1>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 ml-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              {connectionStatus === 'ok' ? (
                <Wifi className="w-4 h-4 text-gain" />
              ) : connectionStatus === 'partial' ? (
                <Wifi className="w-4 h-4 text-warning" />
              ) : (
                <WifiOff className="w-4 h-4 text-loss" />
              )}
              <span className={cn(
                "text-xs",
                connectionStatus === 'ok' ? 'text-gain' : 
                connectionStatus === 'partial' ? 'text-warning' : 'text-loss'
              )}>
                {connectionStatus === 'ok' ? 'Connected' : 
                 connectionStatus === 'partial' ? 'Partial' : 'Disconnected'}
              </span>
            </div>

            {/* Last Refresh */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-md hover:bg-surface-2 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

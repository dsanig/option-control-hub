import { useState } from 'react';
import { mockMappings } from '@/data/mockData';
import { ColumnMapping } from '@/types/investment';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Database, 
  RefreshCw, 
  Check, 
  X, 
  Settings2,
  Table,
  Link2,
  TestTube,
  Edit
} from 'lucide-react';
import { ConnectionsSection } from './ConnectionsSection';
import { useDatabaseConnections } from '@/hooks/useDatabaseConnections';

export function SettingsTab() {
  const [activeSection, setActiveSection] = useState<'connections' | 'mappings' | 'rollengine' | 'refresh'>('connections');
  const [mappings] = useState<ColumnMapping[]>(mockMappings);
  const { connections } = useDatabaseConnections();

  const sections = [
    { id: 'connections', label: 'Connections', icon: Database },
    { id: 'mappings', label: 'Schema Mapping', icon: Link2 },
    { id: 'rollengine', label: 'Roll Engine', icon: Settings2 },
    { id: 'refresh', label: 'Refresh Settings', icon: RefreshCw },
  ];


  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-surface-1 border-r border-border p-4">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                )}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeSection === 'connections' && <ConnectionsSection />}

        {activeSection === 'mappings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Schema Mapping</h3>
                <p className="text-sm text-muted-foreground">Map semantic fields to database columns</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2">
                  <Table className="w-4 h-4" />
                  Schema Explorer
                </Button>
                <Button variant="outline" className="gap-2">
                  <TestTube className="w-4 h-4" />
                  Run Diagnostics
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semantic Field</th>
                    <th>Connection</th>
                    <th>Schema.Table.Column</th>
                    <th>Type</th>
                    <th>Sample Value</th>
                    <th>Null Rate</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => {
                    const conn = connections.find(c => c.id === mapping.connectionId);
                    return (
                      <tr key={mapping.id}>
                        <td className="font-medium font-mono text-primary">
                          {mapping.semanticField}
                        </td>
                        <td>
                          <Badge variant="outline" className="text-xs">
                            {conn?.name || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="font-mono text-sm text-muted-foreground">
                          {mapping.schema}.{mapping.table}.{mapping.column}
                        </td>
                        <td>
                          <Badge variant="secondary" className="text-xs">
                            {mapping.dataType}
                          </Badge>
                        </td>
                        <td className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                          {mapping.sampleValue}
                        </td>
                        <td className={cn(
                          "font-mono text-sm",
                          (mapping.nullRate || 0) > 0.1 ? "text-warning" : ""
                        )}>
                          {((mapping.nullRate || 0) * 100).toFixed(1)}%
                        </td>
                        <td>
                          {mapping.isValid ? (
                            <Check className="w-4 h-4 text-gain" />
                          ) : (
                            <X className="w-4 h-4 text-loss" />
                          )}
                        </td>
                        <td>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'rollengine' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Roll Engine Configuration</h3>
              <p className="text-sm text-muted-foreground">Configure how option rolls are detected and calculated</p>
            </div>

            <div className="grid gap-6 max-w-2xl">
              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Timestamp Matching</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exact Timestamp Match</Label>
                      <p className="text-xs text-muted-foreground">Match trades to the exact second</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label>Tolerance (seconds)</Label>
                    <Input type="number" defaultValue="0" className="w-24" disabled />
                    <p className="text-xs text-muted-foreground">Only applies when exact match is disabled</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Credit Calculation</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Fees in Roll Credit</Label>
                      <p className="text-xs text-muted-foreground">Subtract fees from net roll credit</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Realized P/L in Additional Profit</Label>
                      <p className="text-xs text-muted-foreground">Add closing leg P/L to additional profit</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Open/Close Inference</h4>
                <div className="space-y-2">
                  <Label>Inference Method</Label>
                  <Select defaultValue="position_change">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="position_change">Position Change Detection</SelectItem>
                      <SelectItem value="trade_category">Trade Category Field</SelectItem>
                      <SelectItem value="quantity_sign">Quantity Sign Convention</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How to determine if a trade is opening or closing a position
                  </p>
                </div>
              </div>

              <Button className="w-fit">Save Configuration</Button>
            </div>
          </div>
        )}

        {activeSection === 'refresh' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Refresh Settings</h3>
              <p className="text-sm text-muted-foreground">Configure data refresh intervals</p>
            </div>

            <div className="grid gap-6 max-w-2xl">
              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Global Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Refresh Interval</Label>
                    <Select defaultValue="60">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                        <SelectItem value="manual">Manual only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-pause on Error</Label>
                      <p className="text-xs text-muted-foreground">Stop refreshing if connection errors occur</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Per-Tab Overrides</h4>
                <div className="space-y-3">
                  {['Dashboard', 'Options', 'Stocks', 'Risk'].map((tab) => (
                    <div key={tab} className="flex items-center justify-between">
                      <Label>{tab}</Label>
                      <Select defaultValue="inherit">
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">Use Global</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">1 minute</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                          <SelectItem value="manual">Manual only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-fit">Save Settings</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

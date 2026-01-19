import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TestTube } from 'lucide-react';
import { DatabaseConnection, ConnectionFormData } from '@/hooks/useDatabaseConnections';

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: DatabaseConnection;
  onSave: (data: ConnectionFormData) => Promise<void>;
  onTest: (data: ConnectionFormData) => Promise<{ success: boolean; error?: string; latencyMs?: number }>;
  isSaving: boolean;
  isTesting: boolean;
}

export function ConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: ConnectionDialogProps) {
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    connection_type: 'postgresql',
    host: '',
    port: 5432,
    database_name: '',
    schema_name: '',
    username: '',
    password: '',
  });

  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (connection) {
      setFormData({
        id: connection.id,
        name: connection.name,
        connection_type: connection.connection_type,
        host: connection.host,
        port: connection.port,
        database_name: connection.database_name,
        schema_name: connection.schema_name || '',
        username: connection.username,
        password: '', // Don't prefill password
      });
    } else {
      setFormData({
        name: '',
        connection_type: 'postgresql',
        host: '',
        port: 5432,
        database_name: '',
        schema_name: '',
        username: '',
        password: '',
      });
    }
    setTestResult(null);
  }, [connection, open]);

  const handleTest = async () => {
    setTestResult(null);
    const result = await onTest(formData);
    setTestResult({
      success: result.success,
      message: result.success 
        ? `Connected successfully (${result.latencyMs}ms)` 
        : result.error || 'Connection failed',
    });
  };

  const handleSave = async () => {
    await onSave(formData);
    onOpenChange(false);
  };

  const defaultPort = formData.connection_type === 'mssql' ? 1433 : 5432;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{connection ? 'Edit Connection' : 'Add Connection'}</DialogTitle>
          <DialogDescription>
            Configure your database connection settings. Passwords are encrypted at rest.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              placeholder="e.g., Production DB"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Database Type</Label>
            <Select
              value={formData.connection_type}
              onValueChange={(value: 'mssql' | 'postgresql') =>
                setFormData({ ...formData, connection_type: value, port: value === 'mssql' ? 1433 : 5432 })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mssql">Microsoft SQL Server</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="host">Host / IP Address</Label>
              <Input
                id="host"
                placeholder="localhost or 192.168.1.100"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder={String(defaultPort)}
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || defaultPort })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                placeholder="mydb"
                value={formData.database_name}
                onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schema">Schema (optional)</Label>
              <Input
                id="schema"
                placeholder={formData.connection_type === 'mssql' ? 'dbo' : 'public'}
                value={formData.schema_name}
                onChange={(e) => setFormData({ ...formData, schema_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="postgres"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={connection ? '••••••••' : 'Enter password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-md text-sm ${
                testResult.success
                  ? 'bg-gain/10 text-gain border border-gain/30'
                  : 'bg-loss/10 text-loss border border-loss/30'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !formData.host || !formData.database_name}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name || !formData.host || !formData.database_name || !formData.username}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {connection ? 'Update' : 'Save'} Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

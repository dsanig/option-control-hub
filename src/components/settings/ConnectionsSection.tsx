import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Database, 
  Plus, 
  Wifi,
  WifiOff,
  TestTube,
  Pause,
  Play,
  Trash2,
  Edit,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDatabaseConnections, DatabaseConnection, ConnectionFormData } from '@/hooks/useDatabaseConnections';
import { ConnectionDialog } from './ConnectionDialog';
import { formatDistanceToNow } from 'date-fns';

export function ConnectionsSection() {
  const {
    connections,
    isLoading,
    refetch,
    testConnection,
    isTestingConnection,
    saveConnection,
    isSavingConnection,
    deleteConnection,
    updateStatus,
    isLocalMode,
  } = useDatabaseConnections();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<DatabaseConnection | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleAddConnection = () => {
    setEditingConnection(undefined);
    setDialogOpen(true);
  };

  const handleEditConnection = (conn: DatabaseConnection) => {
    setEditingConnection(conn);
    setDialogOpen(true);
  };

  const handleDeleteClick = (conn: DatabaseConnection) => {
    setConnectionToDelete(conn);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (connectionToDelete) {
      await deleteConnection(connectionToDelete.id);
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
    }
  };

  const handleTestConnection = async (conn: DatabaseConnection) => {
    setTestingId(conn.id);
    await testConnection({
      id: conn.id,
      name: conn.name,
      connection_type: conn.connection_type,
      host: conn.host,
      port: conn.port,
      database_name: conn.database_name,
      schema_name: conn.schema_name,
      username: conn.username,
    });
    setTestingId(null);
    refetch();
  };

  const handleTogglePause = async (conn: DatabaseConnection) => {
    const newStatus = conn.status === 'paused' ? 'disconnected' : 'paused';
    await updateStatus({ id: conn.id, status: newStatus });
  };

  const handleSave = async (data: ConnectionFormData) => {
    await saveConnection(data);
  };

  const handleTest = async (data: ConnectionFormData) => {
    return testConnection(data);
  };

  const getStatusBadge = (status: DatabaseConnection['status']) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-gain/20 text-gain border-gain/30">Connected</Badge>;
      case 'warning':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Issues</Badge>;
      case 'error':
        return <Badge className="bg-loss/20 text-loss border-loss/30">Error</Badge>;
      case 'disconnected':
        return <Badge variant="outline">Disconnected</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Database Connections</h3>
            {isLocalMode ? (
              <Badge className="bg-gain/20 text-gain border-gain/30">Local Mode</Badge>
            ) : (
              <Badge variant="outline">Cloud Mode</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isLocalMode 
              ? 'Running locally - all data stays on your machine' 
              : 'Manage MSSQL and PostgreSQL connections'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handleAddConnection} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Connection
          </Button>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No connections configured</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first database connection to start pulling data
          </p>
          <Button onClick={handleAddConnection}>
            <Plus className="w-4 h-4 mr-2" />
            Add Connection
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <div 
              key={conn.id} 
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    conn.status === 'ok' ? "bg-gain/10" : "bg-surface-2"
                  )}>
                    {conn.status === 'ok' ? (
                      <Wifi className="w-5 h-5 text-gain" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{conn.name}</h4>
                      {getStatusBadge(conn.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {conn.connection_type.toUpperCase()} • {conn.host}:{conn.port} • {conn.database_name}
                    </p>
                    {conn.last_success && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last sync: {formatDistanceToNow(new Date(conn.last_success), { addSuffix: true })} 
                        {conn.latency_ms && ` • Latency: ${conn.latency_ms}ms`}
                      </p>
                    )}
                    {conn.last_error && conn.status === 'error' && (
                      <p className="text-xs text-loss mt-1">
                        Error: {conn.last_error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => handleTestConnection(conn)}
                    disabled={testingId === conn.id}
                  >
                    {testingId === conn.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <TestTube className="w-3 h-3" />
                    )}
                    Test
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditConnection(conn)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={conn.status === 'paused' ? '' : 'text-warning'}
                    onClick={() => handleTogglePause(conn)}
                  >
                    {conn.status === 'paused' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-loss hover:text-loss"
                    onClick={() => handleDeleteClick(conn)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editingConnection}
        onSave={handleSave}
        onTest={handleTest}
        isSaving={isSavingConnection}
        isTesting={isTestingConnection}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{connectionToDelete?.name}"? This will also remove all associated schema mappings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-loss hover:bg-loss/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface DatabaseConnection {
  id: string;
  name: string;
  connection_type: 'mssql' | 'postgresql';
  host: string;
  port: number;
  database_name: string;
  schema_name?: string;
  username: string;
  use_ssl?: boolean;
  status: 'ok' | 'warning' | 'error' | 'disconnected' | 'paused';
  last_success?: string;
  last_error?: string;
  latency_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface ConnectionFormData {
  id?: string;
  name: string;
  connection_type: 'mssql' | 'postgresql';
  host: string;
  port: number;
  database_name: string;
  schema_name?: string;
  username: string;
  password?: string;
  use_ssl?: boolean;
}

export interface SchemaExploreResult {
  schemas?: string[];
  tables?: string[];
  columns?: Array<{ name: string; type: string; nullable: boolean }>;
}

// Determine if we're running locally or in cloud
// Local mode: when running on localhost or 127.0.0.1
const isLocalMode = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

// Local API URL (Express server running on port 3001)
const LOCAL_API_URL = 'http://localhost:3001/api/database-proxy';

// Cloud API URL (Supabase Edge Function) - fallback for cloud deployments
const CLOUD_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-proxy`;

function getApiUrl(): string {
  return isLocalMode() ? LOCAL_API_URL : CLOUD_API_URL;
}

async function callDatabaseProxy<T>(action: string, body?: unknown): Promise<T> {
  const apiUrl = getApiUrl();
  const isLocal = isLocalMode();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Only add auth headers for cloud mode
  if (!isLocal) {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    headers['Authorization'] = `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
    headers['apikey'] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }

  const response = await fetch(`${apiUrl}/${action}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export function useDatabaseConnections() {
  const queryClient = useQueryClient();

  // Fetch all connections
  const { data: connections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['database-connections'],
    queryFn: async () => {
      const result = await callDatabaseProxy<{ connections: DatabaseConnection[] }>('list-connections');
      return result.connections;
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (config: ConnectionFormData) => {
      return callDatabaseProxy<{ success: boolean; error?: string; latencyMs?: number }>('test-connection', config);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Connection successful (${result.latencyMs}ms)`);
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

  // Save connection mutation
  const saveConnectionMutation = useMutation({
    mutationFn: async (config: ConnectionFormData) => {
      return callDatabaseProxy<{ success: boolean; connection: DatabaseConnection }>('save-connection', config);
    },
    onSuccess: () => {
      toast.success('Connection saved successfully');
      queryClient.invalidateQueries({ queryKey: ['database-connections'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save connection: ${error.message}`);
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return callDatabaseProxy<{ success: boolean }>('delete-connection', { id });
    },
    onSuccess: () => {
      toast.success('Connection deleted');
      queryClient.invalidateQueries({ queryKey: ['database-connections'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete connection: ${error.message}`);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DatabaseConnection['status'] }) => {
      return callDatabaseProxy<{ success: boolean }>('update-status', { id, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-connections'] });
    },
  });

  // Explore schema
  const exploreSchema = useCallback(async (
    connectionId: string,
    schema?: string,
    table?: string
  ): Promise<SchemaExploreResult> => {
    return callDatabaseProxy<SchemaExploreResult>('explore-schema', {
      connectionId,
      schema,
      table,
    });
  }, []);

  // Execute query
  const executeQuery = useCallback(async (
    connectionId: string,
    query: string,
    params?: unknown[]
  ): Promise<{ success: boolean; data?: unknown[]; error?: string; rowCount?: number; latencyMs?: number }> => {
    return callDatabaseProxy('execute-query', {
      connectionId,
      query,
      params,
    });
  }, []);

  return {
    connections,
    isLoading,
    error,
    refetch,
    testConnection: testConnectionMutation.mutateAsync,
    isTestingConnection: testConnectionMutation.isPending,
    saveConnection: saveConnectionMutation.mutateAsync,
    isSavingConnection: saveConnectionMutation.isPending,
    deleteConnection: deleteConnectionMutation.mutateAsync,
    isDeletingConnection: deleteConnectionMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    exploreSchema,
    executeQuery,
    isLocalMode: isLocalMode(),
  };
}

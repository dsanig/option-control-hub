import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectionConfig {
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

interface QueryRequest {
  connectionId: string;
  query: string;
  params?: unknown[];
}

interface SchemaExploreRequest {
  connectionId: string;
  schema?: string;
  table?: string;
}

// Simple XOR encryption for passwords (in production, use proper encryption)
function encryptPassword(password: string): string {
  const key = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production';
  let result = '';
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(password.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decryptPassword(encrypted: string): string {
  const key = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production';
  const decoded = atob(encrypted);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    console.log(`Database proxy action: ${action}`);

    switch (action) {
      case 'test-connection': {
        const config: ConnectionConfig = await req.json();
        console.log(`Testing connection to ${config.host}:${config.port}`);
        
        const startTime = Date.now();
        const result = await testConnection(config);
        const latencyMs = Date.now() - startTime;
        
        return new Response(
          JSON.stringify({ ...result, latencyMs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save-connection': {
        const config: ConnectionConfig = await req.json();
        console.log(`Saving connection: ${config.name}`);
        
        // Encrypt password before storing
        const encryptedPassword = config.password ? encryptPassword(config.password) : '';
        
        // Test connection first
        const testResult = await testConnection(config);
        
        const connectionData = {
          name: config.name,
          connection_type: config.connection_type,
          host: config.host,
          port: config.port,
          database_name: config.database_name,
          schema_name: config.schema_name || null,
          username: config.username,
          encrypted_password: encryptedPassword,
          use_ssl: config.use_ssl ?? true,
          status: testResult.success ? 'ok' : 'error',
          last_success: testResult.success ? new Date().toISOString() : null,
          last_error: testResult.error || null,
          latency_ms: testResult.latencyMs || null,
        };

        let result;
        if (config.id) {
          // Update existing
          const { data, error } = await supabase
            .from('database_connections')
            .update(connectionData)
            .eq('id', config.id)
            .select()
            .single();
          
          if (error) throw error;
          result = data;
        } else {
          // Create new
          const { data, error } = await supabase
            .from('database_connections')
            .insert(connectionData)
            .select()
            .single();
          
          if (error) throw error;
          result = data;
        }

        // Log audit
        await supabase.from('audit_logs').insert({
          action: config.id ? 'update' : 'create',
          entity_type: 'database_connection',
          entity_id: result.id,
          new_values: { ...connectionData, encrypted_password: '[REDACTED]' },
        });

        return new Response(
          JSON.stringify({ success: true, connection: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-connection': {
        const { id } = await req.json();
        console.log(`Deleting connection: ${id}`);
        
        const { error } = await supabase
          .from('database_connections')
          .delete()
          .eq('id', id);
        
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          action: 'delete',
          entity_type: 'database_connection',
          entity_id: id,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-connections': {
        console.log('Listing all connections');
        
        const { data, error } = await supabase
          .from('database_connections')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Don't return encrypted passwords
        const connections = data.map(conn => ({
          ...conn,
          encrypted_password: undefined,
        }));

        return new Response(
          JSON.stringify({ connections }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'explore-schema': {
        const request: SchemaExploreRequest = await req.json();
        console.log(`Exploring schema for connection: ${request.connectionId}`);
        
        // Get connection config
        const { data: conn, error: connError } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', request.connectionId)
          .single();
        
        if (connError) throw connError;
        
        const config: ConnectionConfig = {
          ...conn,
          password: decryptPassword(conn.encrypted_password),
          use_ssl: conn.use_ssl ?? true,
        };

        const schema = await exploreSchema(config, request.schema, request.table);
        
        return new Response(
          JSON.stringify(schema),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute-query': {
        const request: QueryRequest = await req.json();
        console.log(`Executing query on connection: ${request.connectionId}`);
        
        // Get connection config
        const { data: conn, error: connError } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', request.connectionId)
          .single();
        
        if (connError) throw connError;
        
        const config: ConnectionConfig = {
          ...conn,
          password: decryptPassword(conn.encrypted_password),
          use_ssl: conn.use_ssl ?? true,
        };

        const startTime = Date.now();
        const result = await executeQuery(config, request.query, request.params);
        const latencyMs = Date.now() - startTime;

        // Update connection status
        await supabase
          .from('database_connections')
          .update({
            status: result.success ? 'ok' : 'error',
            last_success: result.success ? new Date().toISOString() : undefined,
            last_error: result.error || null,
            latency_ms: latencyMs,
          })
          .eq('id', request.connectionId);

        return new Response(
          JSON.stringify({ ...result, latencyMs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-status': {
        const { id, status } = await req.json();
        console.log(`Updating connection status: ${id} -> ${status}`);
        
        const { error } = await supabase
          .from('database_connections')
          .update({ status })
          .eq('id', id);
        
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Database proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
  const startTime = Date.now();
  
  try {
    if (config.connection_type === 'postgresql') {
      const useSsl = config.use_ssl ?? true;
      // Use Deno's postgres driver
      const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
      
      const client = new Client({
        hostname: config.host,
        port: config.port,
        database: config.database_name,
        user: config.username,
        password: config.password,
        tls: { enabled: useSsl, enforce: false },
        connection: { attempts: 1 }
      });
      
      await client.connect();
      await client.queryObject("SELECT 1");
      await client.end();
      
      return { success: true, latencyMs: Date.now() - startTime };
    } else if (config.connection_type === 'mssql') {
      // For MSSQL, we'll use a simple TCP connection test
      // Full MSSQL support would require additional driver
      // For now, we test if the port is reachable
      const conn = await Deno.connect({
        hostname: config.host,
        port: config.port,
      });
      conn.close();
      
      // Note: This only tests TCP connectivity, not actual MSSQL auth
      // Full MSSQL support would need a proper driver like tedious
      console.log('MSSQL: TCP connection successful. Note: Full auth test requires MSSQL driver.');
      
      return { 
        success: true, 
        latencyMs: Date.now() - startTime 
      };
    }
    
    return { success: false, error: 'Unsupported connection type' };
  } catch (error) {
    console.error('Connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

async function exploreSchema(
  config: ConnectionConfig, 
  schema?: string, 
  table?: string
): Promise<{ schemas?: string[]; tables?: string[]; columns?: Array<{ name: string; type: string; nullable: boolean }> }> {
  try {
    if (config.connection_type === 'postgresql') {
      const useSsl = config.use_ssl ?? true;
      const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
      
      const client = new Client({
        hostname: config.host,
        port: config.port,
        database: config.database_name,
        user: config.username,
        password: config.password,
        tls: { enabled: useSsl, enforce: false },
      });
      
      await client.connect();
      
      if (!schema) {
        // List all schemas
        const result = await client.queryObject<{ schema_name: string }>(
          "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY schema_name"
        );
        await client.end();
        return { schemas: result.rows.map(r => r.schema_name) };
      } else if (!table) {
        // List tables in schema
        const result = await client.queryObject<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
          [schema]
        );
        await client.end();
        return { tables: result.rows.map(r => r.table_name) };
      } else {
        // List columns in table
        const result = await client.queryObject<{ column_name: string; data_type: string; is_nullable: string }>(
          "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
          [schema, table]
        );
        await client.end();
        return { 
          columns: result.rows.map(r => ({ 
            name: r.column_name, 
            type: r.data_type, 
            nullable: r.is_nullable === 'YES' 
          })) 
        };
      }
    } else if (config.connection_type === 'mssql') {
      // MSSQL schema exploration would require proper driver
      // Return placeholder for now
      console.log('MSSQL schema exploration not fully implemented');
      return { schemas: ['dbo'] };
    }
    
    return {};
  } catch (error) {
    console.error('Schema exploration failed:', error);
    throw error;
  }
}

async function executeQuery(
  config: ConnectionConfig, 
  query: string, 
  params?: unknown[]
): Promise<{ success: boolean; data?: unknown[]; error?: string; rowCount?: number }> {
  try {
    if (config.connection_type === 'postgresql') {
      const useSsl = config.use_ssl ?? true;
      const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
      
      const client = new Client({
        hostname: config.host,
        port: config.port,
        database: config.database_name,
        user: config.username,
        password: config.password,
        tls: { enabled: useSsl, enforce: false },
      });
      
      await client.connect();
      
      const result = params && params.length > 0
        ? await client.queryObject(query, params)
        : await client.queryObject(query);
      
      await client.end();
      
      return { 
        success: true, 
        data: result.rows, 
        rowCount: result.rowCount ?? result.rows.length 
      };
    } else if (config.connection_type === 'mssql') {
      // MSSQL query execution would require proper driver
      console.log('MSSQL query execution not fully implemented');
      return { success: false, error: 'MSSQL driver not available in edge functions. Consider using a proxy service.' };
    }
    
    return { success: false, error: 'Unsupported connection type' };
  } catch (error) {
    console.error('Query execution failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

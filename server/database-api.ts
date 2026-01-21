import express from 'express';
import { Client } from 'pg';

const router = express.Router();

// Middleware to parse JSON
router.use(express.json());

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

// In-memory storage for connections (for local development)
// In production, you'd use a local SQLite or file-based storage
const connections = new Map<string, ConnectionConfig & { 
  id: string; 
  status: string; 
  created_at: string; 
  updated_at: string;
  last_success?: string;
  last_error?: string;
  latency_ms?: number;
}>();

function generateId(): string {
  return crypto.randomUUID();
}

// Test connection endpoint
router.post('/test-connection', async (req, res) => {
  const config: ConnectionConfig = req.body;
  console.log(`[Local] Testing connection to ${config.host}:${config.port}`);
  
  const startTime = Date.now();
  
  try {
    if (config.connection_type === 'postgresql') {
      const client = new Client({
        host: config.host,
        port: config.port,
        database: config.database_name,
        user: config.username,
        password: config.password,
        ssl: config.use_ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
      });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      
      const latencyMs = Date.now() - startTime;
      res.json({ success: true, latencyMs });
    } else if (config.connection_type === 'mssql') {
      // MSSQL support would require mssql package
      res.json({ success: false, error: 'MSSQL not yet implemented for local mode. Install mssql package.' });
    } else {
      res.json({ success: false, error: 'Unsupported connection type' });
    }
  } catch (error) {
    console.error('[Local] Connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.json({ success: false, error: errorMessage });
  }
});

// Save connection endpoint
router.post('/save-connection', async (req, res) => {
  const config: ConnectionConfig = req.body;
  console.log(`[Local] Saving connection: ${config.name}`);
  
  try {
    // Test connection first
    const startTime = Date.now();
    let testSuccess = false;
    let testError: string | undefined;
    
    if (config.connection_type === 'postgresql') {
      try {
        const client = new Client({
          host: config.host,
          port: config.port,
          database: config.database_name,
          user: config.username,
          password: config.password,
          ssl: config.use_ssl ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 10000,
        });
        
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        testSuccess = true;
      } catch (error) {
        testError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    const latencyMs = Date.now() - startTime;
    const now = new Date().toISOString();
    
    const connectionData = {
      id: config.id || generateId(),
      name: config.name,
      connection_type: config.connection_type,
      host: config.host,
      port: config.port,
      database_name: config.database_name,
      schema_name: config.schema_name || null,
      username: config.username,
      password: config.password, // Stored in memory only
      use_ssl: config.use_ssl ?? true,
      status: testSuccess ? 'ok' : 'error',
      last_success: testSuccess ? now : undefined,
      last_error: testError,
      latency_ms: latencyMs,
      created_at: config.id ? connections.get(config.id)?.created_at || now : now,
      updated_at: now,
    };
    
    connections.set(connectionData.id, connectionData);
    
    // Return without password
    const { password, ...safeConnection } = connectionData;
    res.json({ success: true, connection: safeConnection });
  } catch (error) {
    console.error('[Local] Save connection failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// Delete connection endpoint
router.post('/delete-connection', async (req, res) => {
  const { id } = req.body;
  console.log(`[Local] Deleting connection: ${id}`);
  
  connections.delete(id);
  res.json({ success: true });
});

// List connections endpoint
router.post('/list-connections', async (_req, res) => {
  console.log('[Local] Listing all connections');
  
  const connectionList = Array.from(connections.values()).map(conn => {
    const { password, ...safeConnection } = conn;
    return safeConnection;
  });
  
  res.json({ connections: connectionList });
});

// Explore schema endpoint
router.post('/explore-schema', async (req, res) => {
  const { connectionId, schema, table } = req.body;
  console.log(`[Local] Exploring schema for connection: ${connectionId}`);
  
  const conn = connections.get(connectionId);
  if (!conn) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }
  
  try {
    if (conn.connection_type === 'postgresql') {
      const client = new Client({
        host: conn.host,
        port: conn.port,
        database: conn.database_name,
        user: conn.username,
        password: conn.password,
        ssl: conn.use_ssl ? { rejectUnauthorized: false } : false,
      });
      
      await client.connect();
      
      if (!schema) {
        // List all schemas
        const result = await client.query(
          "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY schema_name"
        );
        await client.end();
        res.json({ schemas: result.rows.map(r => r.schema_name) });
      } else if (!table) {
        // List tables in schema
        const result = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
          [schema]
        );
        await client.end();
        res.json({ tables: result.rows.map(r => r.table_name) });
      } else {
        // List columns in table
        const result = await client.query(
          "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
          [schema, table]
        );
        await client.end();
        res.json({ 
          columns: result.rows.map(r => ({ 
            name: r.column_name, 
            type: r.data_type, 
            nullable: r.is_nullable === 'YES' 
          })) 
        });
      }
    } else {
      res.json({ schemas: [] });
    }
  } catch (error) {
    console.error('[Local] Schema exploration failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// Execute query endpoint
router.post('/execute-query', async (req, res) => {
  const { connectionId, query, params } = req.body;
  console.log(`[Local] Executing query on connection: ${connectionId}`);
  
  const conn = connections.get(connectionId);
  if (!conn) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }
  
  const startTime = Date.now();
  
  try {
    if (conn.connection_type === 'postgresql') {
      const client = new Client({
        host: conn.host,
        port: conn.port,
        database: conn.database_name,
        user: conn.username,
        password: conn.password,
        ssl: conn.use_ssl ? { rejectUnauthorized: false } : false,
      });
      
      await client.connect();
      
      const result = params && params.length > 0
        ? await client.query(query, params)
        : await client.query(query);
      
      await client.end();
      
      const latencyMs = Date.now() - startTime;
      
      // Update connection status
      conn.status = 'ok';
      conn.last_success = new Date().toISOString();
      conn.latency_ms = latencyMs;
      conn.last_error = undefined;
      
      res.json({ 
        success: true, 
        data: result.rows, 
        rowCount: result.rowCount ?? result.rows.length,
        latencyMs 
      });
    } else {
      res.json({ success: false, error: 'Unsupported connection type' });
    }
  } catch (error) {
    console.error('[Local] Query execution failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update connection status
    conn.status = 'error';
    conn.last_error = errorMessage;
    
    res.json({ success: false, error: errorMessage });
  }
});

// Update status endpoint
router.post('/update-status', async (req, res) => {
  const { id, status } = req.body;
  console.log(`[Local] Updating connection status: ${id} -> ${status}`);
  
  const conn = connections.get(id);
  if (conn) {
    conn.status = status;
    conn.updated_at = new Date().toISOString();
  }
  
  res.json({ success: true });
});

export default router;

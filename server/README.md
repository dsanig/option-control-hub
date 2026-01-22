# Local Database Server

This server runs locally on your machine to handle database connections without sending any data to the cloud.

## Quick Start

1. **Start the local API server** (in one terminal):
   ```bash
   npx tsx server/index.ts
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 and configure your database connections in Settings.

## How It Works

- The app always connects to the local API server (port 3001)
- All database credentials and queries stay on your local machine
- Connections are stored in memory (cleared on server restart)

## Features

- **PostgreSQL**: Full support for connection testing, schema exploration, and query execution
- **MSSQL**: TCP connectivity test only (full support requires additional driver)

## Environment Variables

- `API_PORT`: Change the API server port (default: 3001)

## Security Notes

- Credentials are only stored in memory while the server is running
- No data is transmitted to external servers
- The server only accepts connections from local origins (localhost or private network IPs)

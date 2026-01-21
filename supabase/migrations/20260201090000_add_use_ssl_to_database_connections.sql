ALTER TABLE public.database_connections
ADD COLUMN IF NOT EXISTS use_ssl BOOLEAN NOT NULL DEFAULT true;

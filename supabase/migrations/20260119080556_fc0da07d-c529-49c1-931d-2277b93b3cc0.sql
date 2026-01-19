-- Create table for storing database connections
CREATE TABLE public.database_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('mssql', 'postgresql')),
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  database_name TEXT NOT NULL,
  schema_name TEXT,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('ok', 'warning', 'error', 'disconnected', 'paused')),
  last_success TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing schema mappings
CREATE TABLE public.schema_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semantic_field TEXT NOT NULL UNIQUE,
  connection_id UUID NOT NULL REFERENCES public.database_connections(id) ON DELETE CASCADE,
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('date', 'datetime', 'numeric', 'text', 'boolean')),
  is_valid BOOLEAN NOT NULL DEFAULT false,
  sample_value TEXT,
  null_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for roll engine configuration
CREATE TABLE public.roll_engine_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exact_timestamp_match BOOLEAN NOT NULL DEFAULT true,
  tolerance_seconds INTEGER NOT NULL DEFAULT 0,
  include_fees_in_credit BOOLEAN NOT NULL DEFAULT true,
  include_realized_pl BOOLEAN NOT NULL DEFAULT true,
  inference_method TEXT NOT NULL DEFAULT 'position_change' CHECK (inference_method IN ('position_change', 'trade_category', 'quantity_sign')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for refresh settings
CREATE TABLE public.refresh_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  global_interval_seconds INTEGER NOT NULL DEFAULT 60,
  auto_pause_on_error BOOLEAN NOT NULL DEFAULT true,
  tab_overrides JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roll_engine_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- For internal app (local network), allow all operations
-- In production, add proper auth-based policies
CREATE POLICY "Allow all operations on database_connections" 
ON public.database_connections FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on schema_mappings" 
ON public.schema_mappings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on roll_engine_config" 
ON public.roll_engine_config FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on refresh_settings" 
ON public.refresh_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on audit_logs" 
ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_database_connections_updated_at
BEFORE UPDATE ON public.database_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schema_mappings_updated_at
BEFORE UPDATE ON public.schema_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roll_engine_config_updated_at
BEFORE UPDATE ON public.roll_engine_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refresh_settings_updated_at
BEFORE UPDATE ON public.refresh_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default roll engine config
INSERT INTO public.roll_engine_config (exact_timestamp_match, tolerance_seconds, include_fees_in_credit, include_realized_pl, inference_method)
VALUES (true, 0, true, true, 'position_change');

-- Insert default refresh settings
INSERT INTO public.refresh_settings (global_interval_seconds, auto_pause_on_error, tab_overrides)
VALUES (60, true, '{}');
-- Add operator_name column to track who is doing the sorting
ALTER TABLE public.sorting_logs 
ADD COLUMN operator_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sorting_logs.operator_name IS 'Name of the person/operator performing the sorting';

-- Create index for faster queries by operator
CREATE INDEX idx_sorting_logs_operator_name ON public.sorting_logs(operator_name);
CREATE INDEX idx_sorting_logs_operator_logged_at ON public.sorting_logs(operator_name, logged_at DESC);

-- Create a view for hourly output per operator
CREATE OR REPLACE VIEW public.hourly_operator_output AS
SELECT 
  operator_name,
  DATE_TRUNC('hour', logged_at) AS hour,
  COUNT(*) AS total_logs,
  SUM(quantity_all_sorting) AS total_sorted,
  SUM(quantity_ng) AS total_ng,
  ROUND(
    CASE 
      WHEN SUM(quantity_all_sorting) > 0 
      THEN (SUM(quantity_ng)::NUMERIC / SUM(quantity_all_sorting)::NUMERIC * 100)
      ELSE 0 
    END, 
    2
  ) AS ng_rate_percent
FROM public.sorting_logs
WHERE operator_name IS NOT NULL
GROUP BY operator_name, DATE_TRUNC('hour', logged_at)
ORDER BY hour DESC, operator_name;

-- Create a materialized view for better performance (optional, can be refreshed periodically)
-- Uncomment if you need better performance with large datasets
-- CREATE MATERIALIZED VIEW public.hourly_operator_output_materialized AS
-- SELECT * FROM public.hourly_operator_output;
-- CREATE INDEX idx_hourly_operator_materialized ON public.hourly_operator_output_materialized(operator_name, hour DESC);

-- Grant access to the view
GRANT SELECT ON public.hourly_operator_output TO anon, authenticated;


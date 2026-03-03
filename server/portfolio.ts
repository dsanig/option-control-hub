import { query } from './db';

interface SummaryOptions {
  accountId?: string;
}

function getTableReference() {
  const schema = process.env.PORTFOLIO_SCHEMA ?? 'public';
  const table = process.env.PORTFOLIO_TABLE ?? 'portfolio_positions';
  const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  if (!validIdentifier.test(schema) || !validIdentifier.test(table)) {
    throw new Error('Invalid PORTFOLIO_SCHEMA or PORTFOLIO_TABLE identifier');
  }

  return `"${schema}"."${table}"`;
}

export async function getPortfolioSummary(options: SummaryOptions = {}) {
  const tableRef = getTableReference();

  const summaryQuery = `
    SELECT
      COUNT(*)::int AS position_count,
      COALESCE(SUM(market_value), 0)::numeric AS total_market_value,
      COALESCE(SUM(unrealized_pnl), 0)::numeric AS total_unrealized_pnl,
      COALESCE(AVG(delta), 0)::numeric AS avg_delta,
      MAX(updated_at) AS last_updated_at
    FROM ${tableRef}
    WHERE ($1::text IS NULL OR account_id::text = $1::text)
  `;

  const res = await query(summaryQuery, [options.accountId ?? null]);
  return res.rows[0] ?? null;
}

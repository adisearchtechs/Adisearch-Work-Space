import { NextResponse } from 'next/server';
import { agentModelReadiness } from '@/lib/agent/orchestrator';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

export async function GET() {
   const databaseConfigured = isSupabaseConfigured();
   const agent = agentModelReadiness();
   const ready = databaseConfigured && agent.available;

   return NextResponse.json(
      {
         status: ready ? 'ready' : 'degraded',
         database: { configured: databaseConfigured },
         agent,
      },
      {
         status: ready ? 200 : 503,
         headers: { 'Cache-Control': 'no-store' },
      }
   );
}

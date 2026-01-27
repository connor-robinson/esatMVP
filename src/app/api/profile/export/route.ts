import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/export
 * Exports all user data as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch all user data
    const [paperSessions, builderSessions, builderAttempts, questionBankAttempts, dailyMetrics] = await Promise.all([
      // Paper sessions
      supabase
        .from('paper_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Builder sessions
      supabase
        .from('builder_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Builder attempts
      supabase
        .from('builder_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Question bank attempts
      supabase
        .from('question_bank_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Daily metrics
      supabase
        .from('user_daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false }),
    ]);

    // Convert to CSV format
    const csvRows: string[] = [];
    
    // Paper Sessions
    csvRows.push('=== PAPER SESSIONS ===');
    if (paperSessions.data && paperSessions.data.length > 0) {
      const headers = Object.keys(paperSessions.data[0]).join(',');
      csvRows.push(headers);
      paperSessions.data.forEach((row: any) => {
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v).replace(/,/g, ';');
        });
        csvRows.push(values.join(','));
      });
    } else {
      csvRows.push('No paper sessions found');
    }
    csvRows.push('');

    // Builder Sessions
    csvRows.push('=== BUILDER SESSIONS ===');
    if (builderSessions.data && builderSessions.data.length > 0) {
      const headers = Object.keys(builderSessions.data[0]).join(',');
      csvRows.push(headers);
      builderSessions.data.forEach((row: any) => {
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v).replace(/,/g, ';');
        });
        csvRows.push(values.join(','));
      });
    } else {
      csvRows.push('No builder sessions found');
    }
    csvRows.push('');

    // Builder Attempts
    csvRows.push('=== BUILDER ATTEMPTS ===');
    if (builderAttempts.data && builderAttempts.data.length > 0) {
      const headers = Object.keys(builderAttempts.data[0]).join(',');
      csvRows.push(headers);
      builderAttempts.data.forEach((row: any) => {
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v).replace(/,/g, ';');
        });
        csvRows.push(values.join(','));
      });
    } else {
      csvRows.push('No builder attempts found');
    }
    csvRows.push('');

    // Question Bank Attempts
    csvRows.push('=== QUESTION BANK ATTEMPTS ===');
    if (questionBankAttempts.data && questionBankAttempts.data.length > 0) {
      const headers = Object.keys(questionBankAttempts.data[0]).join(',');
      csvRows.push(headers);
      questionBankAttempts.data.forEach((row: any) => {
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v).replace(/,/g, ';');
        });
        csvRows.push(values.join(','));
      });
    } else {
      csvRows.push('No question bank attempts found');
    }
    csvRows.push('');

    // Daily Metrics
    csvRows.push('=== DAILY METRICS ===');
    if (dailyMetrics.data && dailyMetrics.data.length > 0) {
      const headers = Object.keys(dailyMetrics.data[0]).join(',');
      csvRows.push(headers);
      dailyMetrics.data.forEach((row: any) => {
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v).replace(/,/g, ';');
        });
        csvRows.push(values.join(','));
      });
    } else {
      csvRows.push('No daily metrics found');
    }

    const csvContent = csvRows.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `user-data-export-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Export API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


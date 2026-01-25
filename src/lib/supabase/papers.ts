/**
 * Supabase CRUD operations for paper sessions
 */

import { supabase, handleSupabaseError } from './client';
import type { PaperSession } from '@/types/papers';
import type { PaperSessionInsert } from './types';

export async function createPaperSession(session: Omit<PaperSession, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    // Note: user_id will be set automatically by RLS or should be passed separately
    const insertData: Omit<PaperSessionInsert, 'user_id'> & { user_id?: string } = {
      paper_name: session.paperName,
      paper_variant: session.paperVariant,
      session_name: session.sessionName,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : null,
      time_limit_minutes: session.timeLimitMinutes,
      question_start: session.questionRange.start,
      question_end: session.questionRange.end,
      selected_sections: session.selectedSections || null,
      answers: session.answers as any,
      correct_flags: session.correctFlags as any,
      guessed_flags: session.guessedFlags as any,
      mistake_tags: session.mistakeTags as any,
      score: session.score as any,
      notes: session.notes || null,
    };

    const { data, error } = await (supabase as any)
      .from('paper_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

export async function updatePaperSession(id: string, updates: Partial<PaperSession>) {
  try {
    const updateData: Partial<PaperSessionInsert> = {
      ...(updates.paperName && { paper_name: updates.paperName }),
      ...(updates.paperVariant && { paper_variant: updates.paperVariant }),
      ...(updates.sessionName && { session_name: updates.sessionName }),
      ...(updates.endedAt && { ended_at: new Date(updates.endedAt).toISOString() }),
      ...(updates.timeLimitMinutes && { time_limit_minutes: updates.timeLimitMinutes }),
      ...(updates.answers && { answers: updates.answers as any }),
      ...(updates.correctFlags && { correct_flags: updates.correctFlags as any }),
      ...(updates.guessedFlags && { guessed_flags: updates.guessedFlags as any }),
      ...(updates.mistakeTags && { mistake_tags: updates.mistakeTags as any }),
      ...(updates.score && { score: updates.score as any }),
      ...(updates.notes && { notes: updates.notes || null }),
    };

    const { data, error } = await (supabase as any)
      .from('paper_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

export async function getPaperSessions() {
  try {
    const { data, error } = await supabase
      .from('paper_sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

export async function getPaperSession(id: string) {
  try {
    const { data, error } = await supabase
      .from('paper_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

export async function deletePaperSession(id: string) {
  try {
    const { error } = await supabase
      .from('paper_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

export async function deleteAllPaperSessions(userId: string) {
  try {
    const { error } = await supabase
      .from('paper_sessions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

export async function getPaperSessionAnalytics(paperName?: string) {
  try {
    let query = supabase
      .from('paper_sessions')
      .select('*')
      .not('score', 'is', null);

    if (paperName) {
      query = query.eq('paper_name', paperName);
    }

    const { data, error } = await query.order('started_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}



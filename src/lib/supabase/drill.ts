/**
 * Supabase CRUD operations for drill items
 */

import { supabase, handleSupabaseError } from './client';
import type { DrillItem } from '@/types/papers';

export async function createDrillItem(item: Omit<DrillItem, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const { data, error } = await (supabase as any)
      .from('drill_items')
      .insert({
        paper_name: item.paperName,
        question_number: item.questionNumber,
        correct_choice: item.correctChoice,
        explanation: item.explanation,
        last_wrong_at: new Date(item.lastWrongAt).toISOString(),
        last_reviewed_at: item.lastReviewedAt ? new Date(item.lastReviewedAt).toISOString() : null,
        last_outcome: item.lastOutcome,
        last_time_sec: item.lastTimeSec,
        review_count: item.reviewCount,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function updateDrillItem(id: string, updates: Partial<DrillItem>) {
  try {
    const { data, error } = await (supabase as any)
      .from('drill_items')
      .update({
        ...(updates.correctChoice && { correct_choice: updates.correctChoice }),
        ...(updates.explanation && { explanation: updates.explanation }),
        ...(updates.lastReviewedAt && { last_reviewed_at: new Date(updates.lastReviewedAt).toISOString() }),
        ...(updates.lastOutcome && { last_outcome: updates.lastOutcome }),
        ...(updates.lastTimeSec && { last_time_sec: updates.lastTimeSec }),
        ...(updates.reviewCount && { review_count: updates.reviewCount }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function getDrillItems(paperName?: string) {
  try {
    let query = supabase
      .from('drill_items')
      .select('*');

    if (paperName) {
      query = query.eq('paper_name', paperName);
    }

    const { data, error } = await query.order('last_wrong_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function getDrillItem(id: string) {
  try {
    const { data, error } = await supabase
      .from('drill_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function deleteDrillItem(id: string) {
  try {
    const { error } = await supabase
      .from('drill_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function getDrillStats(paperName?: string) {
  try {
    let query = supabase
      .from('drill_items')
      .select('id, last_reviewed_at');

    if (paperName) {
      query = query.eq('paper_name', paperName);
    }

    const { data, error } = await query;

    if (error) throw error;

    const reviewed = data.filter(item => item.last_reviewed_at).length;
    const never = data.length - reviewed;

    return {
      reviewed,
      never,
      total: data.length
    };
  } catch (error) {
    handleSupabaseError(error);
  }
}



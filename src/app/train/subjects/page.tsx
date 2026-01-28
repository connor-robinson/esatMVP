/**
 * Redirect from /train/subjects to /skills/subjects
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TrainSubjectsRedirect() {
  redirect('/skills/subjects');
}

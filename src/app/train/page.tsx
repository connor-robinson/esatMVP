/**
 * Redirect from /train to /skills/drill
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TrainRedirect() {
  redirect('/skills/drill');
}

































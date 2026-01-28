/**
 * Redirect from /train/drill to /skills/drill
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TrainDrillRedirect() {
  redirect('/skills/drill');
}

/**
 * Redirect from /train/analytics to /skills/analytics
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TrainAnalyticsRedirect() {
  redirect('/skills/analytics');
}

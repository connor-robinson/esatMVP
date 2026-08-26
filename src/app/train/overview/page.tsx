/**
 * Redirect from /train/overview to the authenticated dashboard
 */

import { redirect } from 'next/navigation';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/onboarding/redirect';

export const dynamic = 'force-dynamic';

export default function TrainOverviewRedirect() {
  redirect(DEFAULT_POST_AUTH_PATH);
}

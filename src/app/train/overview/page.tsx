/**
 * Redirect from /train/overview to homepage
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TrainOverviewRedirect() {
  redirect('/');
}

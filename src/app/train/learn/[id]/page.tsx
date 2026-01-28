/**
 * Redirect from /train/learn/[id] to /skills/learn/[id]
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TrainLearnRedirect({
  params,
}: {
  params: { id: string };
}) {
  const id = params?.id;
  
  if (id) {
    redirect(`/skills/learn/${id}`);
  } else {
    redirect('/skills/drill');
  }
}

































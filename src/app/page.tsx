import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default async function HomePage() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    // Stream is the default view (V3 philosophy: ambient recall, not inbox)
    redirect('/stream');
  } else {
    redirect('/login');
  }
}

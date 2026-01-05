import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isAuthenticated } from '@/lib/auth';

export default async function HomePage() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    const cookieStore = await cookies();
    const viewMode = cookieStore.get('leo_view_mode')?.value;

    if (viewMode === 'inbox') {
      redirect('/inbox');
    } else {
      redirect('/stream');
    }
  } else {
    redirect('/login');
  }
}

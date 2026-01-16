/**
 * Index page for /tasks/view - redirects to browse
 */

import { redirect } from 'next/navigation';

export default function TaskViewIndexPage() {
  redirect('/tasks/browse');
}


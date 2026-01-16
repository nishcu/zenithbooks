/**
 * Index page for /tasks/manage - redirects to my-tasks
 */

import { redirect } from 'next/navigation';

export default function TaskManageIndexPage() {
  redirect('/tasks/my-tasks');
}


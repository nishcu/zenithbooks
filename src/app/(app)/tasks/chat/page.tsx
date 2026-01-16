/**
 * Index page for /tasks/chat - redirects to browse
 */

import { redirect } from 'next/navigation';

export default function TaskChatIndexPage() {
  redirect('/tasks/browse');
}


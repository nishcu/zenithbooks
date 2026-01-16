/**
 * API Route: Send Chat Message
 * POST /api/tasks/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendTaskChatMessage, getTaskPost } from '@/lib/tasks/firestore';
import type { TaskChat } from '@/lib/professionals/types';

// Initialize Firebase Admin if needed
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const userName = decodedToken.name || decodedToken.email || 'User';

    // Get request body
    const body = await request.json();
    const { taskId, message } = body;

    // Validate required fields
    if (!taskId || !message) {
      return NextResponse.json(
        { error: 'Task ID and message are required' },
        { status: 400 }
      );
    }

    // Check if task exists
    const task = await getTaskPost(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized (task poster or assigned professional)
    if (task.postedBy !== userId && task.assignedTo !== userId) {
      return NextResponse.json(
        { error: 'You are not authorized to chat on this task' },
        { status: 403 }
      );
    }

    // Send message
    const chatData: Omit<TaskChat, 'id' | 'createdAt'> = {
      taskId,
      senderId: userId,
      senderName: userName,
      message: message.trim(),
    };

    const chatId = await sendTaskChatMessage(chatData);

    return NextResponse.json({
      success: true,
      chatId,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', message: error.message },
      { status: 500 }
    );
  }
}


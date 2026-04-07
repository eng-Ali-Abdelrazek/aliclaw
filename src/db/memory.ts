import { getDb } from './index.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function saveMessage(userId: number, role: 'user' | 'assistant' | 'system', content: string) {
  const db = getDb();
  await db.collection('users').doc(userId.toString()).collection('messages').add({
    role,
    content,
    timestamp: new Date()
  });
}

export async function getHistory(userId: number, limit: number = 20): Promise<ChatMessage[]> {
  const db = getDb();
  const snapshot = await db.collection('users').doc(userId.toString()).collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const rows: ChatMessage[] = [];
  snapshot.forEach((doc) => {
    rows.push({
      role: doc.data().role,
      content: doc.data().content
    });
  });

  return rows.reverse();
}

export async function clearHistory(userId: number) {
  const db = getDb();
  const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
  const snapshot = await messagesRef.get();
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

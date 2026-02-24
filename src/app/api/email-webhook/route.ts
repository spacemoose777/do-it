import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

// Extract #hashtag list names from subject
function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g);
  return matches ? matches.map((m) => m.slice(1).toLowerCase()) : [];
}

// Strip hashtags from text
function stripHashtags(text: string): string {
  return text.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.SENDGRID_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "SendGrid webhook secret not configured" }, { status: 500 });
  }

  // Verify secret token from URL query parameter
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== webhookSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Parse the multipart/form-data body
  const formData = await req.formData();
  const from = formData.get("from") as string;
  const subject = (formData.get("subject") as string) || "New Task";
  const bodyPlain = (formData.get("text") as string) || "";

  // Extract sender email address
  const senderEmail = from?.match(/<([^>]+)>/)?.[1] || from;

  if (!senderEmail) {
    return NextResponse.json({ error: "No sender email" }, { status: 400 });
  }

  // Look up Firebase user by email
  let userId: string;
  try {
    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.getUserByEmail(senderEmail);
    userId = userRecord.uid;
  } catch {
    // User not found — silently ignore unregistered senders
    return NextResponse.json({ ok: true, note: "sender not registered" });
  }

  const db = getAdminFirestore();

  // Look up user's task lists to find matching list by hashtag
  const listsSnap = await db
    .collection("users")
    .doc(userId)
    .collection("task_lists")
    .get();

  const hashtags = extractHashtags(subject);
  const cleanSubject = stripHashtags(subject);

  // Find matching list (first hashtag that matches a list name)
  let targetListId: string | null = null;
  for (const tag of hashtags) {
    const match = listsSnap.docs.find(
      (d) => d.data().name.toLowerCase() === tag
    );
    if (match) {
      targetListId = match.id;
      break;
    }
  }

  // Fall back to default list
  if (!targetListId) {
    const defaultDoc = listsSnap.docs.find((d) => d.data().is_default);
    targetListId = defaultDoc?.id || listsSnap.docs[0]?.id || null;
  }

  if (!targetListId) {
    return NextResponse.json({ error: "No task list found for user" }, { status: 400 });
  }

  // Build task
  const now = new Date().toISOString();
  const taskId = uuidv4();
  const taskData = {
    list_id: targetListId,
    title: cleanSubject || "Email task",
    notes: bodyPlain.slice(0, 2000),
    is_completed: false,
    completed_at: null,
    is_important: false,
    is_my_day: true,
    my_day_date: now.slice(0, 10),
    due_date: null,
    due_time: null,
    reminder_at: null,
    reminders: [],
    recurrence_rule: null,
    sort_order: 0,
    my_day_sort_order: null,
    priority: null,
    created_at: now,
    updated_at: now,
  };

  await db
    .collection("users")
    .doc(userId)
    .collection("tasks")
    .doc(taskId)
    .set(taskData);

  return NextResponse.json({ ok: true, taskId });
}

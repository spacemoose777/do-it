import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function verifyMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const hmac = crypto.createHmac("sha256", signingKey);
  hmac.update(timestamp + token);
  return hmac.digest("hex") === signature;
}

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
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    return NextResponse.json({ error: "Mailgun signing key not configured" }, { status: 500 });
  }

  // Parse the multipart/form-data body
  const formData = await req.formData();
  const timestamp = formData.get("timestamp") as string;
  const token = formData.get("token") as string;
  const signature = formData.get("signature") as string;
  const sender = formData.get("sender") as string || formData.get("from") as string;
  const subject = (formData.get("subject") as string) || "New Task";
  const bodyPlain = (formData.get("body-plain") as string) || "";

  // Verify Mailgun webhook signature
  if (!verifyMailgunSignature(signingKey, timestamp, token, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Extract sender email address
  const senderEmail = sender.match(/<([^>]+)>/)?.[1] || sender;

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

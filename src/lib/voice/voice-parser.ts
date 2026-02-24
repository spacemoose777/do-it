import * as chrono from "chrono-node";
import type { VoiceCommand, VoiceCommandType } from "@/types/voice";
import { format } from "date-fns";

// Patterns to detect voice commands
const READ_PATTERNS = [
  /^(read|what'?s on|show|tell me|list)\s*(my\s*day|today'?s?\s*tasks?|my\s*tasks?)/i,
  /^what('?s| is)\s*(on\s*)?my\s*(day|list|tasks?)/i,
  /^read\s*(out\s*)?(my\s*)?tasks?/i,
];

const WHATS_NEXT_PATTERNS = [
  /^what'?s?\s*next/i,
  /^next\s*task/i,
  /^what\s*(should|do)\s*i\s*do\s*next/i,
];

const ADD_PATTERNS = [
  /^(add|create|new|make)\s*(a\s*)?(task\s*)?(.+)/i,
  /^(remind\s*me\s*to)\s+(.+)/i,
  /^(i\s*need\s*to)\s+(.+)/i,
];

// Extract "list: <name>" or "in <name> list" from the end of the text
function extractListName(text: string): { text: string; listName?: string } {
  // Match ", list: <name>" or " list: <name>" at end
  const colonPattern = /,?\s*list:\s*([^,]+?)\s*$/i;
  const colonMatch = text.match(colonPattern);
  if (colonMatch) {
    const cleaned = text.slice(0, text.length - colonMatch[0].length).trim();
    return { text: cleaned || text, listName: colonMatch[1].trim() };
  }

  // Match " in <name> list" at end
  const inListPattern = /\s+in\s+(.+?)\s+list\s*$/i;
  const inMatch = text.match(inListPattern);
  if (inMatch) {
    const cleaned = text.replace(inMatch[0], "").trim();
    return { text: cleaned || text, listName: inMatch[1].trim() };
  }

  return { text };
}

export function parseVoiceInput(rawText: string): VoiceCommand {
  const text = rawText.trim();

  // Check for "read my day" commands
  for (const pattern of READ_PATTERNS) {
    if (pattern.test(text)) {
      return { type: "read_my_day", rawText: text };
    }
  }

  // Check for "what's next" commands
  for (const pattern of WHATS_NEXT_PATTERNS) {
    if (pattern.test(text)) {
      return { type: "whats_next", rawText: text };
    }
  }

  // Check for explicit "add task" commands
  for (const pattern of ADD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Get the task text (last capture group)
      const taskText = match[match.length - 1].trim();
      return parseTaskText(taskText, text);
    }
  }

  // Default: treat the entire input as a task to add
  return parseTaskText(text, text);
}

function parseTaskText(taskText: string, rawText: string): VoiceCommand {
  // Extract list name if present
  const { text: textWithoutList, listName } = extractListName(taskText);

  // Use chrono to extract dates from natural language
  const parsed = chrono.parse(textWithoutList, new Date(), { forwardDate: true });

  let title = textWithoutList;
  let dueDate: string | undefined;

  if (parsed.length > 0) {
    const result = parsed[0];
    const dateStr = result.start.date();
    dueDate = format(dateStr, "yyyy-MM-dd");

    // Remove the date text from the title
    title = textWithoutList
      .replace(result.text, "")
      .replace(/\s+/g, " ")
      .trim();

    // Clean up common leftover words
    title = title
      .replace(/^\s*(on|by|for|at|the)\s+/i, "")
      .replace(/\s+(on|by|for|at|the)\s*$/i, "")
      .trim();
  }

  // If we stripped the date and there's nothing left, use original text
  if (!title) {
    title = textWithoutList;
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    type: "add_task",
    rawText,
    taskTitle: title,
    dueDate,
    listName,
  };
}

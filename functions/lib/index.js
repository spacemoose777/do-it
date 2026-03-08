"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReminders = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
exports.sendReminders = (0, scheduler_1.onSchedule)({ schedule: "every 5 minutes", timeZone: "UTC" }, async () => {
    var _a, _b, _c;
    const now = new Date();
    const nowISO = now.toISOString();
    // Collection group query — searches users/{uid}/tasks across all users
    const tasksSnap = await db
        .collectionGroup("tasks")
        .where("reminder_at", "<=", nowISO)
        .get();
    if (tasksSnap.empty)
        return;
    // Group tasks by user — uid comes from the doc path (users/{uid}/tasks/{taskId})
    // because user_id is stripped from the Firestore doc when pushed by the client
    const byUser = new Map();
    for (const doc of tasksSnap.docs) {
        const data = doc.data();
        if (data["is_completed"] === true)
            continue;
        if (!data["reminder_at"])
            continue;
        const uid = (_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (!uid)
            continue;
        if (!byUser.has(uid))
            byUser.set(uid, []);
        byUser.get(uid).push(doc);
    }
    for (const [uid, tasks] of byUser) {
        // Get all FCM tokens for this user
        const tokensSnap = await db
            .collection("users")
            .doc(uid)
            .collection("fcm_tokens")
            .get();
        if (tokensSnap.empty)
            continue;
        const tokens = tokensSnap.docs
            .map((d) => d.data()["token"])
            .filter(Boolean);
        if (tokens.length === 0)
            continue;
        const batch = db.batch();
        for (const taskDoc of tasks) {
            const task = taskDoc.data();
            // Data-only FCM messages — our SW push handler shows the notification
            const messages = tokens.map((token) => ({
                token,
                data: {
                    title: `Reminder: ${task["title"]}`,
                    body: task["notes"] || "You have a task reminder",
                    tag: `reminder-${taskDoc.id}`,
                    taskId: taskDoc.id,
                },
            }));
            try {
                const result = await messaging.sendEach(messages);
                // Remove stale tokens
                for (let i = 0; i < result.responses.length; i++) {
                    if (!result.responses[i].success) {
                        const code = (_b = result.responses[i].error) === null || _b === void 0 ? void 0 : _b.code;
                        if (code === "messaging/registration-token-not-registered" ||
                            code === "messaging/invalid-registration-token") {
                            const staleToken = tokens[i];
                            const staleDoc = tokensSnap.docs.find((d) => d.data()["token"] === staleToken);
                            if (staleDoc)
                                batch.delete(staleDoc.ref);
                        }
                    }
                }
            }
            catch (err) {
                console.error(`FCM send error for user ${uid}:`, err);
            }
            // Clear the fired reminder from the task
            const rawReminders = task["reminders"];
            const allReminders = Array.isArray(rawReminders) && rawReminders.length > 0
                ? rawReminders
                : task["reminder_at"]
                    ? [task["reminder_at"]]
                    : [];
            const remaining = allReminders.filter((r) => new Date(r) > now);
            batch.update(taskDoc.ref, {
                reminders: remaining,
                reminder_at: (_c = remaining[0]) !== null && _c !== void 0 ? _c : null,
                updated_at: nowISO,
            });
        }
        await batch.commit();
    }
});
//# sourceMappingURL=index.js.map
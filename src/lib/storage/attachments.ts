import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "@/lib/firebase/config";
import type { Attachment } from "@/types/task";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function uploadAttachment(
  userId: string,
  taskId: string,
  file: File,
  onProgress: (pct: number) => void
): { promise: Promise<Attachment>; cancel: () => void } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      promise: Promise.reject(new Error("File exceeds 25 MB limit")),
      cancel: () => {},
    };
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `users/${userId}/tasks/${taskId}/${uuidv4()}${ext ? `.${ext}` : ""}`;
  const storageRef = ref(storage, path);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: { originalName: file.name },
  });

  const promise = new Promise<Attachment>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url,
            path,
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });

  return { promise, cancel: () => uploadTask.cancel() };
}

export async function deleteAttachment(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

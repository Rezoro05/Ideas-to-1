/** Every Idea Note is also emailed to Rez through Formspree. The visitor's email is used only there, never shown. */
import type { Note } from "../lib/notes";

export interface Inbox { send(note: Note, email: string, page: string): Promise<boolean> }

export function inboxFields(note: Note, email: string, page: string): [string, string][] {
  return [
    ["name", note.name],
    ...(email ? [["email", email] as [string, string]] : []),
    ["message", note.message],
    ["idea_id", note.id],
    ["page", page],
    ["_subject", `New idea on your site from ${note.name}`],
  ];
}

export function formspreeInbox(endpoint: string, doFetch: typeof fetch): Inbox {
  return {
    async send(note, email, page) {
      try {
        const fd = new FormData();
        for (const [k, val] of inboxFields(note, email, page)) fd.append(k, val);
        const r = await doFetch(endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } });
        return r.ok;
      } catch { return false; }
    },
  };
}

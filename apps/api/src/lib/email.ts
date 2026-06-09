import { config } from "../config.js";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function sendViaPostmark(message: EmailMessage): Promise<boolean> {
  const { from, postmarkToken } = config.email;
  if (!postmarkToken || !from) return false;

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": postmarkToken,
    },
    body: JSON.stringify({
      From: from,
      To: message.to,
      Subject: message.subject,
      TextBody: message.text,
      HtmlBody: message.html ?? message.text,
    }),
  });

  if (!res.ok) {
    console.error("[email] Postmark failed:", await res.text());
    return false;
  }
  return true;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const postmarkReady =
    config.email.provider === "postmark" &&
    config.email.postmarkToken &&
    config.email.from;

  if (postmarkReady) {
    await sendViaPostmark(message);
    return;
  }

  if (config.isDev) {
    console.log("\n--- Mneme email (dev) ---");
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log(message.text);
    console.log("------------------------\n");
    return;
  }

  console.warn("[email] No provider configured — message not sent:", message.subject);
}

export function isEmailDeliveryConfigured(): boolean {
  return (
    config.email.provider === "postmark" &&
    Boolean(config.email.postmarkToken && config.email.from)
  );
}

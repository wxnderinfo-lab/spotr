import "server-only";
import { site } from "@/config/site";

// App-mails (niet de Auth-mails; die verstuurt Supabase met de templates in
// supabase/templates). Zonder RESEND_API_KEY en EMAIL_FROM wordt er niets
// verstuurd en blijft de mail in de wachtrij staan.
export const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

type Rendered = { subject: string; text: string };

export function render(template: string, payload: Record<string, unknown>): Rendered | null {
  if (template === "ouderlijke_toestemming") {
    const link = `${site.url}/toestemming?token=${encodeURIComponent(String(payload.token))}`;
    return {
      subject: `${payload.child_name || "Uw kind"} vraagt toestemming voor Jobmarkt`,
      text: [
        "Beste ouder of voogd,",
        "",
        `${payload.child_name || "Uw kind"} (16 of 17 jaar) heeft een account op Jobmarkt, een website waar mensen opdrachten plaatsen en aannemen, en vraagt uw toestemming om opdrachten te plaatsen en voorstellen te sturen.`,
        "",
        `Lees wat dit betekent en geef toestemming via deze link: ${link}`,
        "",
        "Wilt u geen toestemming geven? Dan hoeft u niets te doen.",
        "",
        "Met vriendelijke groet,",
        "Jobmarkt",
      ].join("\n"),
    };
  }
  if (template === "zoekmelding") {
    return {
      subject: `Nieuwe opdrachten voor "${payload.name}"`,
      text: [
        `Er ${Number(payload.count) === 1 ? "is 1 nieuwe opdracht" : `zijn ${payload.count} nieuwe opdrachten`} die passen bij je zoekopdracht "${payload.name}":`,
        "",
        ...((payload.jobs as { title: string; url: string }[]) ?? []).map((j) => `- ${j.title}\n  ${j.url}`),
        "",
        `Meldingen beheren: ${site.url}/account/favorieten`,
      ].join("\n"),
    };
  }
  return null;
}

export async function sendEmail(to: string, mail: Rendered) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: mail.subject, text: mail.text }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}`);
}

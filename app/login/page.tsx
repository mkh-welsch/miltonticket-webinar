import Link from "next/link";
import DemoLogin from "@/components/auth/demo-login";

export const metadata = {
  title: "Zugang · Milton Webinare",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const demoEnabled = process.env.NODE_ENV !== "production" && process.env.WEBINAR_DEMO_MODE === "true";

  return (
    <main className="login-page">
      <div className="login-atmosphere" aria-hidden="true" />
      <section className="login-copy">
        <Link href="https://miltonticket.app" className="brand-lockup">
          <span className="brand-mark">M</span>
          <span>Milton Ticket</span>
        </Link>
        <div>
          <span className="eyebrow">Webinare</span>
          <h1>Ihr Raum für Live-Beratung.</h1>
          <p>
            Webinar-Zugänge werden sicher über Milton Ticket ausgestellt. Öffnen Sie dort Ihren
            Termin oder den Einladungslink.
          </p>
        </div>
        {query.error && (
          <p className="login-error" role="alert">
            Der Einladungslink ist ungültig oder abgelaufen. Bitte öffnen Sie den Termin erneut in Milton Ticket.
          </p>
        )}
        <div className="login-actions">
          <Link className="login-action" href="https://miltonticket.app/crm">
            Zu Milton Ticket
          </Link>
          {demoEnabled && <DemoLogin />}
        </div>
      </section>
      <aside className="login-note">
        <span>Kein separates Konto</span>
        <p>Ihre Milton-Rolle und Webinar-Berechtigung werden für jede Sitzung neu geprüft.</p>
      </aside>
    </main>
  );
}

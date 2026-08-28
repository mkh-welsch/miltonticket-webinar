# Milton Webinare

White-Label-Webinare und Video-Sprechstunden für `miltonticket.app`, auf Basis von Next.js und Stream Video.

## Herkunft und Lizenz

Dieses Repository ist ein Fork von [`ladunjexa/nextjs14-zoom`](https://github.com/ladunjexa/nextjs14-zoom), Commit `6fa0fe7994a548064e74a17f35dca85693bfac6b`. Der Upstream steht unter der MIT-Lizenz; der Lizenztext bleibt in [`LICENSE`](./LICENSE) erhalten.

Der Fork ersetzt Yoom/Clerk durch:

- Milton-Ticket-Handoff mit kurzlebigen HMAC-signierten Tickets,
- HTTP-only Webinar-Sitzungen,
- Rollen `administrator`, `host` und `attendee`,
- call-spezifische Stream-Tokens für Teilnehmer,
- Stream-`livestream`-Calls mit Backstage und Host-Rolle,
- deutschsprachiges Milton-Branding.

## Lokale Entwicklung

Voraussetzungen: Node.js 22.13 oder neuer und pnpm 10.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Ohne Stream-Zugangsdaten zeigt die geschützte Anwendung einen klaren Einrichtungsstatus. Eine lokale Host-Sitzung kann ausschließlich außerhalb von Production mit `WEBINAR_DEMO_MODE=true` geöffnet werden.

## Konfiguration

| Variable | Sichtbarkeit | Zweck |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Browser | Kanonische Webinar-URL |
| `NEXT_PUBLIC_STREAM_API_KEY` | Browser | Öffentlicher Stream-App-Key |
| `STREAM_SECRET_KEY` | Server | Erzeugt Stream-Token und verwaltet Calls |
| `MILTON_WEBINAR_HANDOFF_SECRET` | Server, geteilt | Prüft von Milton Ticket ausgestellte Handoffs |
| `WEBINAR_SESSION_SECRET` | Server | Signiert die lokale HTTP-only Sitzung |
| `MILTON_API_BASE_URL` | Server | Zielbasis für normalisierte Webinar-Ereignisse |
| `MILTON_WEBINAR_EVENTS_SECRET` | Server, geteilt | Signiert den Ereignis-Rückfluss an Milton Ticket |
| `MILTON_WEBINAR_CONTROL_SECRET` | Server, geteilt | Prüft zeitgebundene Einwilligungs- und Löschbefehle von Milton |
| `WEBINAR_RECORDING_ENABLED` | Server | Fail-closed Freigabe für Aufzeichnungen; standardmäßig `false` |
| `WEBINAR_RECORDING_MAX_RETENTION_DAYS` | Server | Harte Obergrenze für die Aufbewahrung, Standard 30 Tage |
| `WEBINAR_DEMO_MODE` | lokal | Aktiviert ausschließlich lokal die Demo-Sitzung |

Alle HMAC-Secrets müssen unterschiedlich, stabil und mindestens 32 Zeichen lang sein. `STREAM_SECRET_KEY` darf nie mit `NEXT_PUBLIC_` beginnen oder an den Browser ausgeliefert werden.

## Qualitätsgates

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Ein Build ohne echte Stream-Zugangsdaten beweist nur die App-Buildfähigkeit. Production Ready erfordert zusätzlich die in [`docs/PRODUCTION_READINESS.md`](./docs/PRODUCTION_READINESS.md) beschriebenen Browser- und Live-Gates.

## Deployment

Ziel ist ein eigenes Vercel-Projekt unter `webinar.miltonticket.app`. Die Video-/Audioübertragung läuft über Stream Video, nicht über Vercel Functions. Details zu Milton-Verträgen, Webhooks und Rollout enthält [`docs/MILTON_INTEGRATION.md`](./docs/MILTON_INTEGRATION.md).

Der Workflow `Manual Vercel Preview` läuft ausschließlich über `workflow_dispatch`. Er verlangt den vollständigen freigegebenen Commit-SHA, die zugehörige PR-Nummer und eine Freigabereferenz, prüft den erfolgreichen Quality-Check für exakt diesen Commit und akzeptiert nur einen reviewfähigen oder gemergten PR, nie einen ungemergt geschlossenen. Er deployt ausschließlich in die Vercel-Preview-Umgebung. Das GitHub-Environment `webinar-preview` soll mit Required Reviewers sowie den Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` und `VERCEL_PROJECT_ID` geschützt werden. Es existiert kein automatischer oder Production-Deploy-Workflow. Da GitHub neue manuelle Workflows erst aus dem Default-Branch anbietet, wird dieser Workflow erst nach Merge des PR ausführbar.

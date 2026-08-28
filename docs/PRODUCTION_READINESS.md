# Production Readiness

Der Status bleibt **nicht production ready**, bis alle Gates bestanden sind.

## Provider und Datenschutz

- Stream-Vertrag, AVV/DPA, Subprozessoren, Region und Löschfristen freigegeben.
- `livestream`-Call-Type mit Backstage sowie minimalen Host-/Teilnehmer-Capabilities geprüft.
- Aufzeichnung und Transkription standardmäßig aus; explizite Einwilligungs- und Hinweistexte vorhanden.
- Aufbewahrung, Export, Löschung und Incident-Prozess für Aufzeichnungen dokumentiert.
- Kostenalarm und monatliches Minutenbudget eingerichtet. Das Stream-Freikontingent ist kein SLA.

## Deployment

- Eigenes Vercel-Projekt mit Preview, Staging und Production.
- Production-Domain `webinar.miltonticket.app`, TLS, CSP und erlaubte Origins geprüft.
- Secrets pro Umgebung getrennt; keine Preview-Secrets in Production.
- Stream-Webhooks auf stabile HTTPS-Route mit Signaturprüfung konfiguriert.
- Monitoring für Handoff-, Token-, Provider-, Recording- und Webhook-Fehler aktiv.

## Browser-E2E

Jeweils in frischem Browserprofil und mit Console-/Network-Aufzeichnung:

1. Host-Handoff → Reload → Webinar planen → Backstage → live → Bildschirmfreigabe → beenden → Logout → geschützte Route blockiert.
2. Teilnehmer-Handoff → nur erlaubtes Webinar sichtbar → Beitritt ohne Mic/Kamera → unerlaubte Webinar-ID ergibt 404 → Logout/Reload blockiert.
3. Zwei Browser/Geräte: Host live, Teilnehmer empfängt Audio/Video, Reconnect nach Netzunterbrechung.
4. Aufzeichnung mit sichtbarer Einwilligung starten → bereit → im CRM verknüpft → Zugriff rollenbegrenzt → Löschung nachweisbar.
5. Registrant nimmt teil und verlässt den Call → CRM zeigt Teilnahmezeiten genau einmal; No-show bleibt korrekt.

## Release-Gate

Erst wenn Build, Tests, Security-/Dependency-Audit, Staging-E2E und ein echtes Zwei-Geräte-Webinar mit CRM-Rückfluss bestanden sind, darf der Status „production ready“ verwendet werden.

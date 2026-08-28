# Milton-Integration

## Systemgrenze

`miltonticket-app` bleibt führend für CRM-Benutzer, Rollen, Leads, Kampagnen, Einwilligungen und Webinar-Registrierungen. `miltonticket-webinar` ist für Video-Sitzung, Stream-Tokens, Backstage, Live-Status, Aufzeichnung und technische Teilnehmerereignisse zuständig.

Es gibt keinen zweiten Benutzerbestand. Die Webinar-App akzeptiert ausschließlich kurzlebige, von Milton signierte Handoffs.

## Handoff-Vertrag

Milton öffnet:

```text
GET https://webinar.miltonticket.app/api/auth/handoff?token=<signed>&returnTo=/meeting/<call-id>
```

Signierter Payload (`aud=miltonticket-webinar-handoff`, `iss=miltonticket-app`):

```json
{
  "v": 1,
  "sub": "stable-crm-or-registration-id",
  "email": "person@example.com",
  "name": "Person Name",
  "role": "host|administrator|attendee",
  "tenantId": "milton-production",
  "callIds": ["stream-call-id"],
  "iat": 1787918400,
  "exp": 1787919000
}
```

Empfehlung: Handoff-TTL höchstens zehn Minuten. Die Webinar-Sitzung läuft höchstens acht Stunden. Teilnehmer erhalten einen Stream-Call-Token, der auf `livestream:<call-id>` begrenzt ist.

## Später benötigte Milton-Endpunkte

Die gemeinsamen Haken werden erst nach Diff-Abstimmung im Hauptrepository umgesetzt:

1. `POST /api/webinars` – Webinar aus CRM anlegen und Stream-ID speichern.
2. `POST /api/webinars/:id/invitations` – einmaliges Handoff für Host oder Teilnehmer ausstellen.
3. `POST /api/webinars/events` – signierte, idempotente Providerereignisse entgegennehmen. Die Webinar-App sendet `Idempotency-Key: <Stream X-Webhook-Id>` und `X-Milton-Signature: HMAC-SHA256(raw body)`.
4. `GET /api/webinars/:id` – CRM-Status, Termin, Registrierungen, Teilnahme und Aufzeichnung liefern.
5. `DELETE /api/webinars/:id` – Webinar sperren/löschen und Aufbewahrungsworkflow starten.

Jeder schreibende Vertrag benötigt `tenantId`, eine Idempotency-Key-Prüfung, Rollenprüfung, Audit-Eintrag und eine erlaubte Zustandsänderung.

## Aufnahme-Einwilligung und Löschung

Milton übermittelt eine Einwilligungsquittung an `POST /api/webinars/:id/recording-consent`. Der JSON-Body enthält `receiptId`, `tenantId`, `noticeVersion`, `consentedAt` und `retentionDays`. Löschungen werden mit `POST /api/webinars/:id/recordings/delete` und `tenantId`, `sessionId`, `filename` sowie einem der Gründe `retention_expired`, `consent_withdrawn` oder `admin_request` beauftragt.

Beide Routen verlangen `Idempotency-Key`, `X-Milton-Timestamp` als Unix-Sekunden und `X-Milton-Signature = HMAC-SHA256(timestamp + "." + rawBody)` mit dem eigenen `MILTON_WEBINAR_CONTROL_SECRET`. Anfragen außerhalb von fünf Minuten Zeitabweichung werden abgewiesen. Die Mandantenzuordnung wird immer gegen den serverseitigen Stream-Call geprüft.

Der Lösch-Endpunkt speichert die zuletzt bestätigte Löschoperation zusätzlich am Stream-Call. Milton muss bei Wiederholungen denselben stabilen Idempotency-Key senden und bleibt für die dauerhafte, aufzeichnungsübergreifende Deduplizierung führend.

Eine Aufzeichnung startet nur, wenn `WEBINAR_RECORDING_ENABLED=true` gesetzt ist und am Call eine gültige Einwilligungsquittung mit einer Retention innerhalb von `WEBINAR_RECORDING_MAX_RETENTION_DAYS` hinterlegt wurde. Transkription, Closed Captions und HLS werden dadurch nicht automatisch aktiviert. Der Stream-Call-Type muss die Aufnahmeberechtigung für Browserrollen entziehen, sodass nur die serverseitige Steuerung aufnehmen kann.

## Stream-Webhooks

Die Webinar-App muss Provider-Webhooks authentifizieren, Rohpayload und Signatur vor JSON-Verarbeitung prüfen und mindestens folgende Ereignisse idempotent normalisieren:

- Call erstellt/aktualisiert/beendet,
- Teilnehmer beigetreten/verlassen,
- Recording gestartet/gestoppt/bereit/fehlgeschlagen,
- Transkription bereit/fehlgeschlagen,
- Session gestartet/beendet.

An Milton gehen nur normalisierte Ereignisse mit stabiler Event-ID, Call-ID, Ereignistyp, Provider-Zeitpunkt und – sofern vorhanden – Session-ID, stabiler Registrierungs-ID sowie Recording-URL, Dateiname, Recording-Session-ID und Typ. E-Mail, Name und technische Verbindungsdaten werden nicht weitergeleitet und dürfen nicht in Logs landen. Der Milton-Empfänger leitet den Mandanten ausschließlich aus der serverseitig gespeicherten Call-ID ab; ein Provider-Payload darf keinen Mandanten bestimmen.

## Rollen

- `administrator`: alle Webinare des Milton-Mandanten verwalten.
- `host`: Webinare anlegen, Backstage betreten, live schalten, moderieren und beenden.
- `attendee`: ausschließlich explizit freigegebene Calls lesen und beitreten; standardmäßig ohne Kamera-/Mikrofonfreigabe.

Die Stream-Call-Type-Konfiguration ist Teil des Deployments. Der unsichere Call-Type `development` darf in Production nicht verwendet werden.

# Milton-Webinar-Vertrag v1

Die Fork-App verwendet denselben signierten Vertrag wie der Milton-Catch-all:

- Handoff-Claims enthalten `sub`, `email`, `name`, `role`, `tenantId`, `callIds`, `iat`, `exp` und `jti`; die Gültigkeit ist auf zehn Minuten begrenzt.
- Der Handoff wird beim Einstieg genau einmal über `POST /api/webinars/:id/handoff/consume` im Milton-CRM verbraucht. Das zurückgegebene Stream-Token wird nur bis zum Handoff-Ablauf verwendet.
- Stream-Webhooks werden als normalisierte Allowlist mit `x-milton-signature` und `idempotency-key` an `POST /api/webinars/events` gesendet.
- Einladungen, Recording-Consent und Recording-Löschung werden über `/invitations`, `/recording-consent` und den kanonischen Pfad `/recordings/delete` im Milton-CRM geführt (das Singular-Alias bleibt abwärtskompatibel); diese App hält keine eigene Teilnehmer- oder CRM-Wahrheit.

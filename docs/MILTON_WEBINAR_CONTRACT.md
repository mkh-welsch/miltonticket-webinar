# Milton-Webinar-Vertrag v1

Die Fork-App verwendet denselben signierten Vertrag wie der Milton-Catch-all:

- Handoff-Claims enthalten `sub`, `email`, `name`, `role`, `tenantId`, `callIds`, `iat`, `exp` und `jti`; die Gültigkeit ist auf zehn Minuten begrenzt.
- Der Handoff wird beim Einstieg genau einmal über `POST /api/webinars/:id/handoff/consume` im Milton-CRM verbraucht. Die Antwort enthält eine durable, retrybare Consume-Projektion, ein separates Session-Grant (maximal acht Stunden) und ein call-gebundenes Stream-Token mit eigener kurzer Ablaufzeit. Token-Erneuerung erfolgt ausschließlich über `POST /api/webinars/:id/token` mit dem Session-Grant; die zehnminütige Handoff-Laufzeit wird niemals verlängert.
- Stream-Webhooks werden als normalisierte Allowlist mit `x-milton-signature` und `idempotency-key` an `POST /api/webinars/events` gesendet.
- Einladungen, Recording-Consent und Recording-Löschung werden über `/invitations`, `/recording-consent` und den kanonischen Pfad `/recordings/delete` im Milton-CRM geführt (das Singular-Alias bleibt abwärtskompatibel); diese App hält keine eigene Teilnehmer- oder CRM-Wahrheit.
- `MILTON_API_BASE_URL` wird außerhalb lokaler Entwicklung nur mit einer nichtleeren, exakten HTTPS-Origin-Allowlist akzeptiert. Stream-Control und Recording-Löschung werden an Milton signiert weitergeleitet; die Fork führt keine zweite Provider-Wahrheit.

"use client";

import tokenProvider from "@/actions/stream.actions";
import Loader from "@/components/loader";
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import type { WebinarIdentity } from "@/lib/auth/tokens";
import React, { createContext, useContext, useEffect, useState } from "react";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const MiltonIdentityContext = createContext<WebinarIdentity | null>(null);

export function useMiltonIdentity() {
  const identity = useContext(MiltonIdentityContext);
  if (!identity) throw new Error("MiltonIdentityContext ist nicht verfügbar.");
  return identity;
}

export default function StreamVideoProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: WebinarIdentity;
}) {
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const [configurationError, setConfigurationError] = useState("");

  useEffect(() => {
    if (!apiKey) {
      setConfigurationError("Stream Video ist noch nicht konfiguriert.");
      return;
    }

    const client = new StreamVideoClient({
      apiKey,
      user: {
        id: user.sub,
        name: user.name,
      },
      tokenProvider,
    });

    setVideoClient(client);
    return () => {
      void client.disconnectUser();
    };
  }, [user.email, user.name, user.sub]);

  if (configurationError) {
    return (
      <MiltonIdentityContext.Provider value={user}>
        <div className="configuration-shell" role="status">
          <span className="eyebrow">Einrichtung erforderlich</span>
          <h1>Video-Infrastruktur verbinden</h1>
          <p>{configurationError} Hinterlegen Sie API-Key und Secret im Vercel-Projekt.</p>
          <form action="/api/auth/logout" method="post">
            <button className="configuration-logout" type="submit">Abmelden</button>
          </form>
        </div>
      </MiltonIdentityContext.Provider>
    );
  }

  if (!videoClient) return <Loader />;

  return (
    <MiltonIdentityContext.Provider value={user}>
      <StreamVideo client={videoClient}>{children}</StreamVideo>
    </MiltonIdentityContext.Provider>
  );
}

"use client";

import { DeviceSettings, VideoPreview, useCall } from "@stream-io/video-react-sdk";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import type { WebinarIdentity } from "@/lib/auth/tokens";

const MeetingSetup = ({
  identity,
  setIsSetupComplete,
}: {
  identity: WebinarIdentity;
  setIsSetupComplete: (value: boolean) => void;
}) => {
  const isAttendee = identity.role === "attendee";
  const [joinMuted, setJoinMuted] = useState(isAttendee);
  const [joining, setJoining] = useState(false);
  const call = useCall();

  if (!call) {
    throw new Error(`useCall must be used within a StreamCall component`);
  }

  useEffect(() => {
    if (joinMuted) {
      call?.camera.disable();
      call?.microphone.disable();
    } else {
      call?.camera.enable();
      call?.microphone.enable();
    }
  }, [joinMuted, call?.camera, call?.microphone]);

  return (
    <div className="meeting-setup-shell">
      <div className="setup-heading">
        <span className="eyebrow">Gerätecheck</span>
        <h1>{isAttendee ? "Bereit für das Webinar?" : "Backstage vorbereiten"}</h1>
        <p>{identity.name} · {isAttendee ? "Teilnahme" : "Host"}</p>
      </div>
      <div className="video-preview-frame"><VideoPreview /></div>

      <div className="setup-controls">
        <label>
          <input
            type="checkbox"
            checked={joinMuted}
            onChange={e => setJoinMuted(e.target.checked)}
          />
          <span>Ohne Kamera und Mikrofon beitreten</span>
        </label>
        <DeviceSettings />
      </div>

      <Button
        className="setup-primary-action"
        disabled={joining}
        onClick={async () => {
          setJoining(true);
          try {
            await call.join();
            setIsSetupComplete(true);
          } finally {
            setJoining(false);
          }
        }}
      >
        {joining ? "Verbindung wird hergestellt …" : isAttendee ? "Webinar beitreten" : "Backstage betreten"}
      </Button>
    </div>
  );
};

export default MeetingSetup;

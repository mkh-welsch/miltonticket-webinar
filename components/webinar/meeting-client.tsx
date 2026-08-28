"use client";

import { StreamCall, StreamTheme } from "@stream-io/video-react-sdk";
import { useState } from "react";
import type { WebinarIdentity } from "@/lib/auth/tokens";
import useGetCallById from "@/hooks/use-get-call-by-id";
import Loader from "@/components/loader";
import MeetingSetup from "@/components/meeting-setup";
import MeetingRoom from "@/components/meeting-room";
import Alert from "@/components/alert";

export default function MeetingClient({
  id,
  identity,
}: {
  id: string;
  identity: WebinarIdentity;
}) {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { call, isCallLoading } = useGetCallById(id);

  if (isCallLoading) return <Loader />;
  if (!call) return <Alert title="Dieses Webinar wurde nicht gefunden." />;

  return (
    <div className="h-screen w-full">
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <MeetingSetup identity={identity} setIsSetupComplete={setIsSetupComplete} />
          ) : (
            <MeetingRoom identity={identity} />
          )}
        </StreamTheme>
      </StreamCall>
    </div>
  );
}

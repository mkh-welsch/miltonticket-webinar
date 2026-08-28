import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutList, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import EndCallButton from "./end-call-button";
import Loader from "./loader";
import type { WebinarIdentity } from "@/lib/auth/tokens";
import { startWebinarBroadcast, stopWebinarBroadcast } from "@/actions/stream.actions";
import { useToast } from "./ui/use-toast";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

const MeetingRoom = ({ identity }: { identity: WebinarIdentity }) => {
  const router = useRouter();
  const call = useCall();
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get("personal");
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  const [showParticipants, setShowParticipants] = useState<boolean>(false);
  const [recordWithConsent, setRecordWithConsent] = useState(false);
  const [broadcastPending, setBroadcastPending] = useState(false);
  const { toast } = useToast();

  const { useCallCallingState, useIsCallLive, useIsCallRecordingInProgress } = useCallStateHooks();
  const callingState = useCallCallingState();
  const isLive = useIsCallLive();
  const isRecording = useIsCallRecordingInProgress();
  const isHost = identity.role === "host" || identity.role === "administrator";
  const callCustom = call?.state.custom || {};
  const hasRecordingConsent = Boolean(
    callCustom.recording_consent_receipt_id &&
    callCustom.recording_consent_notice_version &&
    callCustom.recording_consented_at &&
    callCustom.recording_retention_days,
  );

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    switch (layout) {
      case "grid":
        return <PaginatedGridLayout />;
      case "speaker-right":
        return <SpeakerLayout participantsBarPosition={"left"} />;
      default:
        return <SpeakerLayout participantsBarPosition={"right"} />;
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="live-room-status">
        <span className={isLive ? "live-indicator active" : "live-indicator"} />
        <span>{isLive ? "Live" : isHost ? "Backstage" : "Warten auf den Host"}</span>
      </div>
      {isRecording && (
        <div className="recording-notice" role="status">
          <span className="recording-dot" aria-hidden="true" />
          <span>Diese Sitzung wird mit dokumentierter Einwilligung aufgezeichnet.</span>
        </div>
      )}
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>
        <div className={cn("h-[calc(100vh-86px)] hidden ml-2", { "show-block": showParticipants })}>
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
      </div>

      <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-5">
        {isHost && !isLive && hasRecordingConsent && (
          <label className="recording-consent-toggle">
            <input
              type="checkbox"
              checked={recordWithConsent}
              onChange={event => setRecordWithConsent(event.target.checked)}
            />
            <span>
              Mit Einwilligung aufzeichnen · Löschung nach {Number(callCustom.recording_retention_days)} Tagen
            </span>
          </label>
        )}
        {isHost && call && (
          <button
            className={isLive ? "broadcast-action stop" : "broadcast-action"}
            disabled={broadcastPending}
            onClick={async () => {
              setBroadcastPending(true);
              try {
                if (isLive) {
                  await stopWebinarBroadcast(call.id);
                } else {
                  await startWebinarBroadcast({ callId: call.id, recording: recordWithConsent });
                }
              } catch (error) {
                toast({
                  title: error instanceof Error ? error.message : "Webinar-Status konnte nicht geändert werden",
                });
              } finally {
                setBroadcastPending(false);
              }
            }}
            type="button"
          >
            {broadcastPending ? "Bitte warten …" : isLive ? "Übertragung stoppen" : "Webinar live schalten"}
          </button>
        )}
        <CallControls onLeave={() => router.push("/")} />

        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
              <LayoutList size={20} className="text-white" />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {["Grid", "Speaker-Left", "Speaker-Right"].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setLayout(item.toLowerCase() as CallLayoutType);
                  }}
                >
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CallStatsButton />
        <button onClick={() => setShowParticipants(prev => !prev)}>
          <div className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <Users size={20} className="text-white" />
          </div>
        </button>
        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  );
};

export default MeetingRoom;

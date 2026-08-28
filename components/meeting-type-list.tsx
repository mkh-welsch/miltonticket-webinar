"use client";

import React, { useState } from "react";
import HomeCard from "./home-card";
import { useRouter } from "next/navigation";
import MeetingModal from "./meeting-modal";
import { useToast } from "./ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import ReactDatePicker from "react-datepicker";
import { Input } from "./ui/input";
import { createWebinar } from "@/actions/stream.actions";

type Props = {};

const MeetingTypeList = (props: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const [meetingState, setMeetingState] = useState<
    "isScheduleMeeting" | "isJoinMeeting" | "isInstantMeeting" | undefined
  >();
  const [values, setValues] = useState({
    dateTime: new Date(),
    description: "",
    link: "",
  });
  const [callDetails, setCallDetails] = useState<{ id: string }>();

  const createMeeting = async () => {
    try {
      if (!values.dateTime) {
        toast({
          title: "Please select a date and time",
        });
        return;
      }

      const isInstant = meetingState === "isInstantMeeting";
      const call = await createWebinar({
        title: values.description || (isInstant ? "Sofort-Webinar" : "Milton Webinar"),
        description: values.description,
        startsAt: isInstant
          ? new Date(Date.now() + 60_000).toISOString()
          : values.dateTime.toISOString(),
        recording: false,
      });

      setCallDetails(call);

      if (isInstant) {
        router.push(`/meeting/${call.id}`);
      }

      toast({
        title: "Webinar wurde angelegt",
      });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Webinar konnte nicht angelegt werden",
      });
    }
  };

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/meeting/${callDetails?.id}`;

  return (
    <section className="webinar-action-list" aria-label="Webinar-Aktionen">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="Sofort-Webinar"
        description="Backstage direkt öffnen"
        handleClick={() => setMeetingState("isInstantMeeting")}
        className="bg-orange-1"
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Webinar planen"
        description="Termin und Thema festlegen"
        handleClick={() => setMeetingState("isScheduleMeeting")}
        className="bg-blue-1"
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="Aufzeichnungen"
        description="Vergangene Sessions ansehen"
        handleClick={() => router.push("/recordings")}
        className="bg-purple-1"
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Einladung öffnen"
        description="Über sicheren Webinar-Link"
        handleClick={() => setMeetingState("isJoinMeeting")}
        className="bg-yellow-1"
      />

      {!callDetails ? (
        <MeetingModal
          isOpen={meetingState === "isScheduleMeeting"}
          onClose={() => setMeetingState(undefined)}
          title="Webinar planen"
          handleClick={createMeeting}
        >
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22px] text-sky-2">
              Titel und Thema
            </label>
            <Textarea
              className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={e => {
                setValues({ ...values, description: e.target.value });
              }}
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22px] text-sky-2">
              Datum und Uhrzeit
            </label>
            <ReactDatePicker
              selected={values.dateTime}
              onChange={(date: Date | null) => {
                if (date) setValues({ ...values, dateTime: date });
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              className="w-full rounded bg-dark-3 p-2 focus:outline-none"
            />
          </div>
        </MeetingModal>
      ) : (
        <MeetingModal
          isOpen={meetingState === "isScheduleMeeting"}
          onClose={() => setMeetingState(undefined)}
          title="Webinar ist geplant"
          className="text-center"
          handleClick={() => {
            navigator.clipboard.writeText(meetingLink);
            toast({ title: "Einladungslink kopiert" });
          }}
          image="/icons/checked.svg"
          buttonIcon="/icons/copy.svg"
          buttonText="Einladungslink kopieren"
        />
      )}
      <MeetingModal
        isOpen={meetingState === "isInstantMeeting"}
        onClose={() => setMeetingState(undefined)}
        title="Sofort-Webinar starten"
        className="text-center"
        buttonText="Backstage öffnen"
        handleClick={createMeeting}
      />

      <MeetingModal
        isOpen={meetingState === "isJoinMeeting"}
        onClose={() => setMeetingState(undefined)}
        title="Einladungslink öffnen"
        className="text-center"
        buttonText="Webinar öffnen"
        handleClick={() => {
          try {
            const invite = new URL(values.link, window.location.origin);
            if (invite.origin !== window.location.origin || !/^\/meeting\/[a-zA-Z0-9_-]+$/.test(invite.pathname)) {
              throw new Error();
            }
            router.push(invite.pathname);
          } catch {
            toast({ title: "Bitte einen gültigen Milton-Webinar-Link einfügen." });
          }
        }}
      >
        <Input
          placeholder="https://webinar.miltonticket.app/meeting/…"
          className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
          onChange={e => setValues({ ...values, link: e.target.value })}
        />
      </MeetingModal>
    </section>
  );
};

export default MeetingTypeList;

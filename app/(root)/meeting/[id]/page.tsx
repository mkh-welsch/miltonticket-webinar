import { notFound } from "next/navigation";
import { requireWebinarSession } from "@/lib/auth/session";
import { canAccessWebinar } from "@/lib/webinar/access";
import MeetingClient from "@/components/webinar/meeting-client";

export default async function Meeting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await requireWebinarSession();
  if (!canAccessWebinar(identity, id)) notFound();
  return <MeetingClient id={id} identity={identity} />;
}

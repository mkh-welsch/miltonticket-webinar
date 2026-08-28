import { notFound } from "next/navigation";
import { requireWebinarSession } from "@/lib/auth/session";
import { canAccessWebinar } from "@/lib/webinar/access";
import {
  authorizedWebinarCall,
  WebinarAccessDeniedError,
} from "@/lib/webinar/call-access";
import MeetingClient from "@/components/webinar/meeting-client";

export default async function Meeting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await requireWebinarSession();
  if (!canAccessWebinar(identity, id)) notFound();
  try {
    await authorizedWebinarCall(identity, id);
  } catch (error) {
    if (error instanceof WebinarAccessDeniedError) notFound();
    throw error;
  }
  return <MeetingClient id={id} identity={identity} />;
}

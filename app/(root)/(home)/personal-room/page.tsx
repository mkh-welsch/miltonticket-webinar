"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWebinar } from "@/actions/stream.actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useMiltonIdentity } from "@/providers/stream-client-provider";

const Detail = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col items-start gap-2 border-b border-white/10 pb-5 xl:flex-row">
    <h2 className="text-sm font-medium uppercase tracking-[.12em] text-sky-1 xl:min-w-40">{title}</h2>
    <p className="text-base font-semibold lg:text-lg">{description}</p>
  </div>
);

export default function PersonalRoom() {
  const router = useRouter();
  const user = useMiltonIdentity();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const startRoom = async () => {
    setPending(true);
    try {
      const webinar = await createWebinar({
        title: `Sprechstunde mit ${user.name}`,
        description: "Persönliche Milton Video-Sprechstunde",
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        recording: false,
      });
      router.push(`/meeting/${webinar.id}?personal=true`);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Sprechstunde konnte nicht geöffnet werden.",
      });
      setPending(false);
    }
  };

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <div>
        <span className="eyebrow">Persönlicher Raum</span>
        <h1 className="mt-3 text-3xl font-bold">Video-Sprechstunde</h1>
      </div>
      <div className="flex w-full flex-col gap-5 xl:max-w-[900px]">
        <Detail title="Host" description={user.name} />
        <Detail title="Format" description="Persönlicher Live-Raum mit Einladungslink" />
        <Detail title="Aufzeichnung" description="Standardmäßig ausgeschaltet" />
      </div>
      <div>
        <Button className="bg-blue-1" disabled={pending} onClick={startRoom}>
          {pending ? "Raum wird vorbereitet …" : "Sprechstunde starten"}
        </Button>
      </div>
    </section>
  );
}

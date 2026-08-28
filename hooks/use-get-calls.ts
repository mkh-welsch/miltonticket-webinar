import { useState, useEffect } from "react";

import { Call, useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useMiltonIdentity } from "@/providers/stream-client-provider";

export default function useGetCalls() {
  const user = useMiltonIdentity();
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const client = useStreamVideoClient();

  useEffect(() => {
    const loadCalls = async () => {
      if (!client || !user.sub) return;

      setIsLoading(true);

      try {
        const { calls } = await client.queryCalls({
          sort: [{ field: "starts_at", direction: -1 }],
          filter_conditions: {
            starts_at: { $exists: true },
            type: "livestream",
            $or: [{ created_by_user_id: user.sub }, { members: { $in: [user.sub] } }],
          },
        });

        setCalls(calls);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCalls();
  }, [client, user.sub]);

  const now = new Date();

  const endedCalls = calls.filter(({ state: { startsAt, endedAt } }: Call) => {
    return (startsAt && new Date(startsAt) < now) || !!endedAt;
  });

  const upcomingCalls = calls.filter(({ state: { startsAt } }: Call) => {
    return startsAt && new Date(startsAt) > now;
  });

  return {
    endedCalls,
    upcomingCalls,
    callRecordings: calls,
    isLoading,
  };
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

// Static key — actor never needs to recreate (this app uses PIN auth, not Internet Identity)
const ACTOR_QUERY_KEY = "actor-anon";

export function useActor() {
  const queryClient = useQueryClient();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY],
    queryFn: async () => {
      // Always use anonymous actor — app uses PIN-based auth, not Internet Identity.
      // Never call _initializeAccessControlWithSecret (method does not exist in backend).
      return await createActorWithConfig();
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: true,
  });

  // When actor becomes available, invalidate all dependent queries so they refetch
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}

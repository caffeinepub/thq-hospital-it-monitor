import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const ACTOR_QUERY_KEY = "actor";

export function useActor() {
  const queryClient = useQueryClient();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY],
    queryFn: async () => {
      // Always use anonymous actor. This app uses PIN-based auth, not Internet Identity.
      // Using II caused sessions to call _initializeAccessControlWithSecret on load,
      // which could fail and leave the actor null, blocking all data loads.
      return await createActorWithConfig();
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When the actor becomes available, trigger dependent data queries
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

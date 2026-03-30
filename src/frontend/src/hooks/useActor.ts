import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity: _identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    // Always use anonymous actor -- app uses PIN-based auth, not Internet Identity
    queryKey: [ACTOR_QUERY_KEY],
    queryFn: async () => {
      // Always create anonymous actor to avoid II session interference
      const actor = await createActorWithConfig();
      // Attempt to initialize access control, but never fail actor creation if it throws
      try {
        const adminToken = getSecretParameter("caffeineAdminToken") || "";
        if (adminToken) {
          await actor._initializeAccessControlWithSecret(adminToken);
        }
      } catch {
        // Non-fatal: app uses PIN-based auth, access control is not required
      }
      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // When the actor becomes available, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}

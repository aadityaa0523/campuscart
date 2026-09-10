import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const groupKey = (id: string) => ["group", id] as const;

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupId ? groupKey(groupId) : ["group", "none"],
    queryFn: () => api.getGroup(groupId!),
    enabled: !!groupId,
    refetchInterval: 15_000, // fallback in case a realtime event is missed — see useGroupRealtime
  });
}

export function useMatches(hostelId: string | undefined, store = "Blinkit") {
  return useQuery({
    queryKey: ["matches", hostelId, store],
    queryFn: () => api.findMatches({ hostelId: hostelId!, store }),
    enabled: !!hostelId,
  });
}

export function useHeatmap() {
  return useQuery({ queryKey: ["heatmap"], queryFn: api.heatmap, refetchInterval: 20_000 });
}

export function useHostels() {
  return useQuery({ queryKey: ["hostels"], queryFn: api.hostels, staleTime: Infinity });
}

export function useMyContribution(groupId: string | undefined) {
  return useQuery({
    queryKey: ["contribution", groupId],
    queryFn: () => api.myContribution(groupId!),
    enabled: !!groupId,
    retry: false,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createGroup,
    onSuccess: (group) => qc.setQueryData(groupKey(group.id), group),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, items }: { groupId: string; items: { name: string; pricePaise: number; quantity?: number }[] }) =>
      api.joinGroup(groupId, items),
    onSuccess: (group) => qc.setQueryData(groupKey(group.id), group),
  });
}

export function useClaimCoordinator(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryFeePaise: number) => api.claimCoordinator(groupId, deliveryFeePaise),
    onSuccess: (group) => qc.setQueryData(groupKey(groupId), group),
  });
}

export function useMarkPaid(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markPaid(groupId),
    // Optimistic — a successful UPI payment is the overwhelmingly common
    // case, no reason to make the student stare at a spinner for it.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["contribution", groupId] });
      const previous = qc.getQueryData(["contribution", groupId]);
      qc.setQueryData(["contribution", groupId], (old: unknown) =>
        old && typeof old === "object" ? { ...old, status: "CLAIMED_PAID" } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(["contribution", groupId], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["contribution", groupId] }),
  });
}

export function useConfirmPayment(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.confirmPayment(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKey(groupId) }),
  });
}

export function useCompleteGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { actualTotalPaise: number; proofImageUrl?: string }) => api.completeGroup(groupId, body),
    onSuccess: (group) => qc.setQueryData(groupKey(groupId), group),
  });
}

export function useRaiseDispute(groupId: string) {
  return useMutation({ mutationFn: (reason: string) => api.raiseDispute(groupId, reason) });
}

export function useUpdateUpiVpa() {
  return useMutation({ mutationFn: api.updateUpiVpa });
}

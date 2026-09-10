import { z } from "zod";

export const itemInputSchema = z.object({
  name: z.string().min(1).max(120),
  pricePaise: z.number().int().positive(),
  quantity: z.number().int().positive().max(50).default(1),
});

export const createGroupSchema = z.object({
  hostelId: z.string().min(1),
  store: z.string().min(1).max(60).default("Blinkit"),
  items: z.array(itemInputSchema).min(1),
});

export const joinGroupSchema = z.object({
  items: z.array(itemInputSchema).min(1),
});

export const addItemsSchema = z.object({
  items: z.array(itemInputSchema).min(1),
});

export const matchQuerySchema = z.object({
  hostelId: z.string().min(1),
  store: z.string().min(1).max(60).default("Blinkit"),
});

export const claimCoordinatorSchema = z.object({
  deliveryFeePaise: z.number().int().min(0).default(0),
});

export const completeGroupSchema = z.object({
  actualTotalPaise: z.number().int().positive(),
  proofImageUrl: z.string().url().optional(),
});

export const confirmPaymentParamsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

export const disputeSchema = z.object({
  reason: z.string().min(3).max(1000),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
});

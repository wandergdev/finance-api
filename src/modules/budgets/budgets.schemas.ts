import { z } from "zod";

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amountLimit: z.number().positive(),
});

export const updateBudgetSchema = z.object({
  amountLimit: z.number().positive(),
});

export const listBudgetsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

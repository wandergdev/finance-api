import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export const updateCategorySchema = createCategorySchema.partial();

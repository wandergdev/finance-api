import { Router } from "express";
import { createBudgetSchema, listBudgetsQuerySchema, updateBudgetSchema } from "./budgets.schemas.js";
import * as budgetsService from "./budgets.service.js";

export const budgetsRouter = Router();

budgetsRouter.get("/", async (req, res) => {
  const filters = listBudgetsQuerySchema.parse(req.query);
  const budgets = await budgetsService.listBudgets(req.userId!, filters);
  res.json(budgets);
});

budgetsRouter.post("/", async (req, res) => {
  const input = createBudgetSchema.parse(req.body);
  const budget = await budgetsService.createBudget(req.userId!, input);
  res.status(201).json(budget);
});

budgetsRouter.patch("/:id", async (req, res) => {
  const { amountLimit } = updateBudgetSchema.parse(req.body);
  const budget = await budgetsService.updateBudget(req.userId!, req.params.id, amountLimit);
  res.json(budget);
});

budgetsRouter.delete("/:id", async (req, res) => {
  await budgetsService.deleteBudget(req.userId!, req.params.id);
  res.status(204).send();
});

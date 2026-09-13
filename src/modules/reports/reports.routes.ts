import { Router } from "express";
import { monthlyQuerySchema, rangeQuerySchema } from "./reports.schemas.js";
import * as reportsService from "./reports.service.js";

export const reportsRouter = Router();

reportsRouter.get("/balance", async (req, res) => {
  const range = rangeQuerySchema.parse(req.query);
  const balance = await reportsService.getBalance(req.userId!, range);
  res.json(balance);
});

reportsRouter.get("/by-category", async (req, res) => {
  const range = rangeQuerySchema.parse(req.query);
  const breakdown = await reportsService.getByCategory(req.userId!, range);
  res.json(breakdown);
});

reportsRouter.get("/monthly", async (req, res) => {
  const { year } = monthlyQuerySchema.parse(req.query);
  const monthly = await reportsService.getMonthly(req.userId!, year);
  res.json(monthly);
});

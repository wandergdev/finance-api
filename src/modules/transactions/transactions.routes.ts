import { Router } from "express";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "./transactions.schemas.js";
import * as transactionsService from "./transactions.service.js";

export const transactionsRouter = Router();

transactionsRouter.get("/", async (req, res) => {
  const filters = listTransactionsQuerySchema.parse(req.query);
  const result = await transactionsService.listTransactions(req.userId!, filters);
  res.json(result);
});

transactionsRouter.post("/", async (req, res) => {
  const input = createTransactionSchema.parse(req.body);
  const transaction = await transactionsService.createTransaction(req.userId!, input);
  res.status(201).json(transaction);
});

transactionsRouter.get("/:id", async (req, res) => {
  const transaction = await transactionsService.getTransaction(req.userId!, req.params.id);
  res.json(transaction);
});

transactionsRouter.patch("/:id", async (req, res) => {
  const input = updateTransactionSchema.parse(req.body);
  const transaction = await transactionsService.updateTransaction(
    req.userId!,
    req.params.id,
    input,
  );
  res.json(transaction);
});

transactionsRouter.delete("/:id", async (req, res) => {
  await transactionsService.deleteTransaction(req.userId!, req.params.id);
  res.status(204).send();
});

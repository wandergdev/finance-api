import cors from "cors";
import express from "express";
import helmet from "helmet";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { budgetsRouter } from "./modules/budgets/budgets.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { transactionsRouter } from "./modules/transactions/transactions.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/categories", requireAuth, categoriesRouter);
  app.use("/api/transactions", requireAuth, transactionsRouter);
  app.use("/api/budgets", requireAuth, budgetsRouter);
  app.use("/api/reports", requireAuth, reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

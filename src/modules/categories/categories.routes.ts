import { Router } from "express";
import { createCategorySchema, updateCategorySchema } from "./categories.schemas.js";
import * as categoriesService from "./categories.service.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (req, res) => {
  const categories = await categoriesService.listCategories(req.userId!);
  res.json(categories);
});

categoriesRouter.post("/", async (req, res) => {
  const input = createCategorySchema.parse(req.body);
  const category = await categoriesService.createCategory(req.userId!, input);
  res.status(201).json(category);
});

categoriesRouter.patch("/:id", async (req, res) => {
  const input = updateCategorySchema.parse(req.body);
  const category = await categoriesService.updateCategory(req.userId!, req.params.id, input);
  res.json(category);
});

categoriesRouter.delete("/:id", async (req, res) => {
  await categoriesService.deleteCategory(req.userId!, req.params.id);
  res.status(204).send();
});

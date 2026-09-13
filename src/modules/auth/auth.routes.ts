import { Router } from "express";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);
  const result = await authService.register(email, password);
  res.status(201).json(result);
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  res.status(200).json(result);
});

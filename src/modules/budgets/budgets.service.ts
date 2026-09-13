import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../utils/http-error.js";
import { monthRange } from "../../utils/date-range.js";

type CreateBudgetInput = {
  categoryId: string;
  year: number;
  month: number;
  amountLimit: number;
};

async function withSpent<T extends { categoryId: string; year: number; month: number; amountLimit: Prisma.Decimal }>(
  userId: string,
  budget: T,
) {
  const { start, end } = monthRange(budget.year, budget.month);
  const spentAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      categoryId: budget.categoryId,
      type: "EXPENSE",
      date: { gte: start, lt: end },
    },
  });

  const spent = spentAgg._sum.amount ?? new Prisma.Decimal(0);
  const remaining = budget.amountLimit.minus(spent);

  return {
    ...budget,
    spent,
    remaining,
    overBudget: remaining.isNegative(),
    percentUsed: budget.amountLimit.isZero()
      ? 0
      : spent.dividedBy(budget.amountLimit).times(100).toNumber(),
  };
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, userId },
  });
  if (!category) {
    throw new NotFoundError("Categoría no encontrada.");
  }
  if (category.type !== "EXPENSE") {
    throw new ConflictError("Los presupuestos solo aplican a categorías de tipo EXPENSE.");
  }

  try {
    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: input.categoryId,
        year: input.year,
        month: input.month,
        amountLimit: new Prisma.Decimal(input.amountLimit),
      },
      include: { category: true },
    });
    return withSpent(userId, budget);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Ya existe un presupuesto para esa categoría en ese mes.");
    }
    throw error;
  }
}

export async function listBudgets(userId: string, filters: { year?: number; month?: number }) {
  const budgets = await prisma.budget.findMany({
    where: { userId, year: filters.year, month: filters.month },
    include: { category: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return Promise.all(budgets.map((budget) => withSpent(userId, budget)));
}

async function getOwnedBudget(userId: string, id: string) {
  const budget = await prisma.budget.findFirst({ where: { id, userId }, include: { category: true } });
  if (!budget) {
    throw new NotFoundError("Presupuesto no encontrado.");
  }
  return budget;
}

export async function updateBudget(userId: string, id: string, amountLimit: number) {
  await getOwnedBudget(userId, id);
  const budget = await prisma.budget.update({
    where: { id },
    data: { amountLimit: new Prisma.Decimal(amountLimit) },
    include: { category: true },
  });
  return withSpent(userId, budget);
}

export async function deleteBudget(userId: string, id: string) {
  await getOwnedBudget(userId, id);
  await prisma.budget.delete({ where: { id } });
}

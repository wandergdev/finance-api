import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

type Range = { from?: Date; to?: Date };

export async function getBalance(userId: string, range: Range) {
  const dateFilter = { gte: range.from, lte: range.to };

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "INCOME", date: dateFilter },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "EXPENSE", date: dateFilter },
    }),
  ]);

  const income = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
  const expense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);

  return { income, expense, balance: income.minus(expense) };
}

export async function getByCategory(userId: string, range: Range) {
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, date: { gte: range.from, lte: range.to } },
    _sum: { amount: true },
  });

  if (grouped.length === 0) {
    return [];
  }

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
  });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return grouped
    .map((g) => ({
      category: categoryById.get(g.categoryId)!,
      total: g._sum.amount ?? new Prisma.Decimal(0),
    }))
    .sort((a, b) => b.total.comparedTo(a.total));
}

export async function getMonthly(userId: string, year: number) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    },
    select: { amount: true, type: true, date: true },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: new Prisma.Decimal(0),
    expense: new Prisma.Decimal(0),
  }));

  for (const tx of transactions) {
    const bucket = months[tx.date.getUTCMonth()];
    if (tx.type === "INCOME") {
      bucket.income = bucket.income.plus(tx.amount);
    } else {
      bucket.expense = bucket.expense.plus(tx.amount);
    }
  }

  return months.map((m) => ({ ...m, balance: m.income.minus(m.expense) }));
}

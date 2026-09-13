import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../utils/http-error.js";

type CreateTransactionInput = {
  categoryId: string;
  amount: number;
  description?: string;
  date: Date;
};

type ListFilters = {
  from?: Date;
  to?: Date;
  categoryId?: string;
  type?: "INCOME" | "EXPENSE";
  page: number;
  pageSize: number;
};

async function getOwnedCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) {
    throw new NotFoundError("Categoría no encontrada.");
  }
  return category;
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const category = await getOwnedCategory(userId, input.categoryId);

  return prisma.transaction.create({
    data: {
      userId,
      categoryId: category.id,
      type: category.type,
      amount: new Prisma.Decimal(input.amount),
      description: input.description,
      date: input.date,
    },
    include: { category: true },
  });
}

export async function listTransactions(userId: string, filters: ListFilters) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    categoryId: filters.categoryId,
    type: filters.type,
    date: {
      gte: filters.from,
      lte: filters.to,
    },
  };

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getTransaction(userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  if (!transaction) {
    throw new NotFoundError("Transacción no encontrada.");
  }
  return transaction;
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: Partial<CreateTransactionInput>,
) {
  await getTransaction(userId, id);

  let categoryId: string | undefined;
  let type: "INCOME" | "EXPENSE" | undefined;
  if (input.categoryId) {
    const category = await getOwnedCategory(userId, input.categoryId);
    categoryId = category.id;
    type = category.type;
  }

  return prisma.transaction.update({
    where: { id },
    data: {
      categoryId,
      type,
      amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
      description: input.description,
      date: input.date,
    },
    include: { category: true },
  });
}

export async function deleteTransaction(userId: string, id: string) {
  await getTransaction(userId, id);
  await prisma.transaction.delete({ where: { id } });
}

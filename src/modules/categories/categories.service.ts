import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../utils/http-error.js";

type CategoryInput = { name: string; type: "INCOME" | "EXPENSE" };

export function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(userId: string, input: CategoryInput) {
  try {
    return await prisma.category.create({ data: { userId, ...input } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Ya tienes una categoría con ese nombre y tipo.");
    }
    throw error;
  }
}

async function getOwnedCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) {
    throw new NotFoundError("Categoría no encontrada.");
  }
  return category;
}

export async function updateCategory(userId: string, id: string, input: Partial<CategoryInput>) {
  await getOwnedCategory(userId, id);

  try {
    return await prisma.category.update({ where: { id }, data: input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Ya tienes una categoría con ese nombre y tipo.");
    }
    throw error;
  }
}

export async function deleteCategory(userId: string, id: string) {
  await getOwnedCategory(userId, id);

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new ConflictError(
        "No se puede eliminar: la categoría tiene transacciones asociadas.",
      );
    }
    throw error;
  }
}

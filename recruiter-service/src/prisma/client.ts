import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "info" },
      { emit: "event", level: "warn" },
    ],
  });

// Setup event listeners
prisma.$on("query" as never, (e: any) => {
  if (process.env.NODE_ENV === "development") {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  }
});

prisma.$on("error" as never, (e: any) => {
  logger.error("Prisma Error:", e);
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Connection handling
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully (recruiter-service)");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info("🔌 Database disconnected (recruiter-service)");
  } catch (error) {
    logger.error("Error disconnecting from database:", error);
    throw error;
  }
}

export default prisma;

import { PrismaClient } from '@prisma/client';
// Allow overriding the DB url for Electron production mode
const dbUrl = process.env.DB_PATH
    ? `file:${process.env.DB_PATH}`
    : process.env.DATABASE_URL;
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
});
export default prisma;

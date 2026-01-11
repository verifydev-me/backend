import { PrismaClient } from '../../node_modules/.prisma/job-client/index.js';
export declare const prisma: PrismaClient<{
    log: ("error" | "warn")[];
}, never, import(".prisma/job-client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export default prisma;

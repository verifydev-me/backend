// ==================== SIMPLE LOGGER ====================
// Basic logger for gRPC utilities (replace with your actual logger)

export const logger = {
  info: (data: any, message?: string) => {
    if (typeof data === 'string') {
      console.log(`[INFO] ${data}`);
    } else {
      console.log(`[INFO] ${message || ''}`, JSON.stringify(data, null, 2));
    }
  },
  
  warn: (data: any, message?: string) => {
    if (typeof data === 'string') {
      console.warn(`[WARN] ${data}`);
    } else {
      console.warn(`[WARN] ${message || ''}`, JSON.stringify(data, null, 2));
    }
  },
  
  error: (data: any, message?: string) => {
    if (typeof data === 'string') {
      console.error(`[ERROR] ${data}`);
    } else {
      console.error(`[ERROR] ${message || ''}`, JSON.stringify(data, null, 2));
    }
  },
};

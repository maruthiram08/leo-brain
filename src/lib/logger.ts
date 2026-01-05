// Structured logging for Vercel
// JSON format makes it easy to search and filter in Vercel logs

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
    event: string;
    userId?: string;
    contentPreview?: string;
    error?: string;
    duration?: number;
    [key: string]: unknown;
}

function formatLog(level: LogLevel, context: LogContext): string {
    return JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        ...context,
    });
}

export function logInfo(context: LogContext): void {
    console.log(formatLog('info', context));
}

export function logWarn(context: LogContext): void {
    console.warn(formatLog('warn', context));
}

export function logError(context: LogContext): void {
    console.error(formatLog('error', context));
}

// Database operation logger
export function logDbOperation(
    operation: string,
    userId: string,
    success: boolean,
    durationMs: number,
    error?: Error
): void {
    const context: LogContext = {
        event: `db_${operation}`,
        userId,
        duration: durationMs,
    };

    if (error) {
        context.error = error.message;
        logError(context);
    } else if (success) {
        logInfo(context);
    }
}

// Retry utility with exponential backoff
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelayMs?: number;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const { maxRetries = 1, baseDelayMs = 100, onRetry } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                onRetry?.(attempt + 1, lastError);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

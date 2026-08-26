/**
 * Crainee Enterprise - Global Error Handling & Recovery Middleware
 * This file catches unhandled exceptions and promise rejections to prevent server crashes.
 */

class ErrorHandler {
    // Global Express Error Middleware
    static handleExpressErrors(err, req, res, next) {
        console.error(`[Crainee Error Log] ${new Date().toISOString()} - ${err.message}`);
        console.error(err.stack);

        const statusCode = err.statusCode || 500;
        const message = err.message || 'An internal server error occurred within the Crainee infrastructure.';

        return res.status(statusCode).json({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    // Catch Uncaught Exceptions (preventing silent process deaths)
    static registerProcessHandlers() {
        process.on('uncaughtException', (error) => {
            console.error('[CRITICAL] Uncaught Exception detected:', error);
            // Perform safe cleanup here if needed before exit
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('[CRITICAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
            // Log rejection safely without letting the Node process crash
        });
    }
}

module.exports = ErrorHandler;

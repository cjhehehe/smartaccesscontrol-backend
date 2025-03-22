import fs from 'fs';
import path from 'path';

const logFile = path.join('logs', 'server.log');

export const logActivity = (message) => {
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFile(logFile, logMessage, (err) => {
        if (err) console.error('Logging error:', err);
    });
};

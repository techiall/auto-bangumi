import winston, { format, transports } from "winston";

export const logger = winston.createLogger({
    level: 'debug',
    format: format.combine(
        format.timestamp(),
        format.json(),
        format.colorize({all: true})
    ),
    transports: [
        new transports.Console(),
    ]
});

import * as Joi from 'joi';

export const configSchema = Joi.object({
  PORT: Joi.number().default(3000),
  LOGGER_LEVEL: Joi.string()
    .valid('log', 'error', 'warn', 'debug', 'verbose', 'fatal')
    .default('log'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PERSISTENCE: Joi.string().valid('fs', 'mongodb').default('fs'),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  API_KEYS: Joi.string().required(),
});

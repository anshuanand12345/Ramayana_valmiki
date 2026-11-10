import { Router } from 'express';
import { chat, search } from '../controllers/chat.controller.js';
import { health } from '../controllers/health.controller.js';
import { dailyQuota } from '../middlewares/dailyQuota.js';
import { chatRateLimit } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import { chatSchema, searchSchema } from '../schemas/chat.schema.js';

export const router = Router();

router.get('/health', health);
router.post('/chat', chatRateLimit, validate(chatSchema), dailyQuota, chat);
router.post('/search', chatRateLimit, validate(searchSchema), dailyQuota, search);

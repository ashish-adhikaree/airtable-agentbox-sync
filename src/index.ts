import LogContextMiddleware from '@/middlewares/log';
import { errorHandler } from '@/middlewares/error';
import { systemLogger } from '@/lib/utils/logger';
import { API_PREFIX } from '@/lib/constants';
import { createNamespace } from 'cls-hooked';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import env from '@/config/env';
import SyncRouter from  "@/routes/sync"

const app = express();

createNamespace('request');

app.use(cookieParser());

app.use(
	cors({
		origin: env.FRONTEND_URL,
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		credentials: true,
	}),
);

app.use(
	express.json({
		limit: '10mb',
	}),
);

app.use(LogContextMiddleware);

app.use(`${API_PREFIX}/sync`, SyncRouter);

app.use(errorHandler);

app.listen(env.PORT, async () => {
	systemLogger.info(`Server is running on http://localhost:${env.PORT}`)
});


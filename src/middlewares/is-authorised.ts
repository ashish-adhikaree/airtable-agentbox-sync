import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import env from '@/config/env';
import { CustomError } from './error';

function getBearerToken(req: Request): string | null {
  const auth = req.get('Authorization');
  if (!auth) return null;

  const parts = auth.split(' ');
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (scheme && scheme.toLowerCase() !== 'bearer') return null;

  return token ? token : null;
}

export default async function isAuthorised(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token || typeof token !== 'string') {
    throw new CustomError('Invalid or missing access token', 400);
  }

  const match = await bcrypt.compare(token, env.ACCESS_TOKEN_HASH);
  if (!match) {
    throw new CustomError('Forbidden: Incorrect access token', 403);
  }

  next();
}

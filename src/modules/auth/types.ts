import { Types } from 'mongoose';
import { UserRole } from '../users/index.js';

/** Shape of the JWT payload — available in every protected route via @CurrentUser() */
export type JwtPayload = {
  readonly userId: string;
  readonly businessId: string;
  readonly role: UserRole;
};

export type AuthTokens = {
  readonly accessToken: string;
};

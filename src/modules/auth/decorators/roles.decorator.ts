import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/index.js';

export const ROLES_KEY = 'roles';

/** Declare which roles are allowed on a route. Used with RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

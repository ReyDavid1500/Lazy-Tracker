import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../types.js';
import { ROLES_KEY } from '../decorators/index.js';
import { UserRole } from '../../users/index.js';

/**
 * Enforces role-based access. Must be used after JwtAuthGuard.
 * If no @Roles() decorator is present the route is accessible to any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    return requiredRoles.includes(request.user.role);
  }
}

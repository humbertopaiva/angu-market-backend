// src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RoleType } from '../entities/role.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug('Required roles:', requiredRoles);

    if (!requiredRoles) {
      this.logger.debug('No roles required, access granted');
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext<{ req: { user?: any } }>().req;
    const user = req?.user;

    this.logger.debug('Full user object:', JSON.stringify(user, null, 2));

    if (!user) {
      this.logger.warn('No user found in request');
      return false;
    }

    // Extrair roles de todas as possíveis fontes
    let userRoles: string[] = [];

    // 1. Se tem roles direto (do JWT)
    if (user.roles && Array.isArray(user.roles)) {
      userRoles.push(...user.roles);
    }

    // 2. Se tem userRoles array (do banco)
    if (user.userRoles && Array.isArray(user.userRoles)) {
      const rolesFromUserRoles = user.userRoles.map((ur: any) => ur.role?.name).filter(Boolean);
      userRoles.push(...rolesFromUserRoles);
    }

    // Remove duplicatas
    userRoles = [...new Set(userRoles)];

    this.logger.debug('User roles found:', userRoles);
    this.logger.debug('Required roles:', requiredRoles);

    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    this.logger.debug('Has required role:', hasRequiredRole);

    if (!hasRequiredRole) {
      this.logger.warn('Access denied - User does not have required roles', {
        required: requiredRoles,
        userHas: userRoles,
      });
    }

    return hasRequiredRole;
  }
}

// src/modules/auth/decorators/current-user.decorator.ts
import { User } from '@/modules/users/entities/user.entity';
import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface RequestWithUser {
  user: User;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User | null => {
    const logger = new Logger('CurrentUser');

    try {
      const ctx = GqlExecutionContext.create(context);
      const request = ctx.getContext<{ req: RequestWithUser }>().req;

      logger.debug('CurrentUser decorator called');
      logger.debug('Request user:', {
        id: request.user?.id,
        email: request.user?.email,
        roles: request.user?.userRoles?.map(ur => ur.role?.name) || [],
      });

      if (!request.user) {
        logger.error('No user found in request');
        return null;
      }

      return request.user;
    } catch (error) {
      logger.error('Error in CurrentUser decorator:', error.message);
      return null;
    }
  },
);

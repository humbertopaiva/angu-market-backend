// src/modules/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  getRequest(context: ExecutionContext): Request {
    const ctx = GqlExecutionContext.create(context);
    const graphqlContext = ctx.getContext<{ req: Request }>();
    const request = graphqlContext.req;

    // Debug: log headers to check if Authorization header is present
    this.logger.debug('Authorization header:', request.headers['authorization']);

    return request;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      this.logger.debug('JwtAuthGuard: Starting validation');
      const result = await super.canActivate(context);
      this.logger.debug('JwtAuthGuard: Validation result:', result);
      return result as boolean;
    } catch (error) {
      this.logger.error('JwtAuthGuard: Validation failed:', error.message);
      throw error;
    }
  }
}

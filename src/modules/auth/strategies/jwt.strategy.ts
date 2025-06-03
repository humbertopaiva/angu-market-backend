// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: { sub: number; email: string; roles: string[] }) {
    try {
      this.logger.debug('JWT Strategy: Validating payload:', {
        userId: payload.sub,
        email: payload.email,
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['userRoles', 'userRoles.role', 'organization', 'place', 'company'],
      });

      if (!user) {
        this.logger.warn('JWT Strategy: User not found:', payload.sub);
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        this.logger.warn('JWT Strategy: User is inactive:', payload.sub);
        throw new UnauthorizedException('User is inactive');
      }

      this.logger.debug('JWT Strategy: User validated successfully:', user.id);

      // Adicione as roles ao objeto de usuário para uso posterior
      const roles = (user.userRoles ?? []).map(userRole => userRole.role.name);
      return { ...user, roles };
    } catch (error) {
      this.logger.error('JWT Strategy: Validation error:', error.message);
      throw new UnauthorizedException(error.message);
    }
  }
}

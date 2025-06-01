import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response';
import { LoginInput } from './dto/login.input';
import { AssignRoleInput } from './dto/assign-role.input';
import { UserRole } from './entities/user-role.entity';

import { RoleType } from './entities/role.entity';

import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async login(@Args('loginInput') loginInput: LoginInput): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.ORGANIZATION_ADMIN)
  @Mutation(() => UserRole)
  assignRole(@Args('assignRoleInput') assignRoleInput: AssignRoleInput) {
    return this.authService.assignRole(assignRoleInput);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.ORGANIZATION_ADMIN)
  @Mutation(() => Boolean)
  async removeRole(
    @Args('userId') userId: number,
    @Args('roleId') roleId: number,
  ): Promise<boolean> {
    await this.authService.removeRole(userId, roleId);
    return true;
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [UserRole])
  userRoles(@Args('userId') userId: number) {
    return this.authService.getUserRoles(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => User)
  me(@CurrentUser() user: User) {
    return user;
  }
}

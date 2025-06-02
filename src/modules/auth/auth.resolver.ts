// src/modules/auth/auth.resolver.ts
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response';
import { LoginInput } from './dto/login.input';
import { SignUpInput } from './dto/signup.input';
import { RequestPasswordResetInput } from './dto/request-password-reset.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { VerifyEmailInput } from './dto/verify-email.input';
import { ResendVerificationInput } from './dto/resend-verification.input';
import { AssignRoleInput } from './dto/assign-role.input';

import { SignUpResponse } from './dto/signup-response';
import { RequestPasswordResetResponse } from './dto/request-password-reset-response';
import { ResetPasswordResponse } from './dto/reset-password-response';
import { VerifyEmailResponse } from './dto/verify-email-response';

import { UserRole } from './entities/user-role.entity';
import { RoleType } from './entities/role.entity';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);

  constructor(private readonly authService: AuthService) {
    this.logger.log('AuthResolver initialized');
  }

  @Mutation(() => SignUpResponse)
  async signUp(@Args('signUpInput') signUpInput: SignUpInput): Promise<SignUpResponse> {
    this.logger.log('SignUp mutation called');
    return this.authService.signUp(signUpInput);
  }

  @Mutation(() => VerifyEmailResponse)
  async verifyEmail(
    @Args('verifyEmailInput') verifyEmailInput: VerifyEmailInput,
  ): Promise<VerifyEmailResponse> {
    this.logger.log('VerifyEmail mutation called');
    return this.authService.verifyEmail(verifyEmailInput);
  }

  @Mutation(() => VerifyEmailResponse)
  async resendVerificationEmail(
    @Args('resendVerificationInput') resendVerificationInput: ResendVerificationInput,
  ): Promise<VerifyEmailResponse> {
    this.logger.log('ResendVerificationEmail mutation called');
    return this.authService.resendVerificationEmail(resendVerificationInput);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('loginInput') loginInput: LoginInput): Promise<AuthResponse> {
    this.logger.log('Login mutation called');
    return this.authService.login(loginInput);
  }

  @Mutation(() => RequestPasswordResetResponse)
  async requestPasswordReset(
    @Args('requestPasswordResetInput') requestPasswordResetInput: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResponse> {
    this.logger.log('RequestPasswordReset mutation called');
    return this.authService.requestPasswordReset(requestPasswordResetInput);
  }

  @Mutation(() => ResetPasswordResponse)
  async resetPassword(
    @Args('resetPasswordInput') resetPasswordInput: ResetPasswordInput,
  ): Promise<ResetPasswordResponse> {
    this.logger.log('ResetPassword mutation called');
    return this.authService.resetPassword(resetPasswordInput);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.ORGANIZATION_ADMIN)
  @Mutation(() => UserRole)
  assignRole(@Args('assignRoleInput') assignRoleInput: AssignRoleInput) {
    this.logger.log('AssignRole mutation called');
    return this.authService.assignRole(assignRoleInput);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.ORGANIZATION_ADMIN)
  @Mutation(() => Boolean)
  async removeRole(
    @Args('userId') userId: number,
    @Args('roleId') roleId: number,
  ): Promise<boolean> {
    this.logger.log('RemoveRole mutation called');
    await this.authService.removeRole(userId, roleId);
    return true;
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [UserRole])
  userRoles(@Args('userId') userId: number) {
    this.logger.log('UserRoles query called');
    return this.authService.getUserRoles(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => User)
  me(@CurrentUser() user: User) {
    this.logger.log('Me query called');
    return user;
  }

  // Mutation de teste simples para verificar se o resolver está funcionando
  @Mutation(() => String)
  testAuth(): string {
    this.logger.log('TestAuth mutation called');
    return 'Auth resolver is working!';
  }
}

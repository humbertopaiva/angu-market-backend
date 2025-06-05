// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity';
import { Role, RoleType } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailService } from '../common/email/email.service';
import { SystemService } from '../common/config/system.service';

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
import { Company } from '../companies/entities/company.entity';
import { CompanyLoginInput } from './dto/company-login.input';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
    private systemService: SystemService,
  ) {}

  async signUp(signUpInput: SignUpInput): Promise<SignUpResponse> {
    const { name, email, password, passwordConfirmation, securityToken } = signUpInput;

    // Validar token de segurança
    const validSecurityToken = this.configService.get<string>('SIGNUP_SECURITY_TOKEN');

    if (!validSecurityToken) {
      throw new BadRequestException('Sistema de registro não configurado corretamente');
    }

    if (securityToken !== validSecurityToken) {
      throw new UnauthorizedException(
        'Token de segurança inválido. Apenas usuários autorizados podem se registrar.',
      );
    }

    // Verificar se as senhas coincidem
    if (password !== passwordConfirmation) {
      throw new BadRequestException('As senhas não coincidem');
    }

    // Verificar se o usuário já existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Usuário já existe com este email');
    }

    // Obter organização principal
    const mainOrganization = await this.systemService.getMainOrganization();

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gerar token de verificação
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = new Date();
    tokenExpiration.setHours(tokenExpiration.getHours() + 24); // 24 horas

    // Criar o usuário (sempre associado à organização principal)
    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      tokenExpiration,
      isVerified: false,
      isActive: false, // Usuário inativo até verificar email
      organizationId: mainOrganization.id,
    });

    const savedUser = await this.userRepository.save(user);

    // Atribuir role de usuário público por padrão
    const publicRole = await this.roleRepository.findOne({
      where: { name: RoleType.PUBLIC_USER },
    });

    if (publicRole) {
      const userRole = this.userRoleRepository.create({
        userId: savedUser.id,
        roleId: publicRole.id,
      });
      await this.userRoleRepository.save(userRole);
    }

    // Enviar email de verificação
    const emailSent = await this.emailService.sendVerificationEmail({
      to: email,
      verificationToken,
      userName: name,
    });

    if (!emailSent) {
      console.warn(`Failed to send verification email to ${email}`);
    }

    return {
      success: true,
      message: 'Usuário criado com sucesso! Verifique seu email para ativar a conta.',
      userId: savedUser.id,
    };
  }

  async companyLogin(companyLoginInput: CompanyLoginInput) {
    const { companySlug, email, password } = companyLoginInput;

    // Buscar a empresa pelo slug
    const company = await this.companyRepository.findOne({
      where: { slug: companySlug, isActive: true },
      relations: ['place'],
    });

    if (!company) {
      throw new UnauthorizedException('Empresa não encontrada ou inativa');
    }

    // Buscar o usuário pelo email e que seja da empresa
    const user = await this.userRepository.findOne({
      where: {
        email,
        companyId: company.id,
        isActive: true,
        isVerified: true,
      },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
      select: ['id', 'email', 'password', 'isActive', 'isVerified', 'uuid', 'name'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado ou não tem acesso a esta empresa');
    }

    // Verificar se o usuário tem role adequada para empresa
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    const companyRoles = [RoleType.COMPANY_ADMIN, RoleType.COMPANY_STAFF];

    if (!userRoles.some(role => companyRoles.includes(role))) {
      throw new UnauthorizedException('Usuário não tem permissão para acessar empresas');
    }

    // Validar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualizar último login
    await this.userRepository.update(user.id, { lastLogin: new Date() });

    // Buscar o usuário completo com todas as relações
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });

    if (!fullUser) {
      throw new UnauthorizedException('Usuário não encontrado após validação.');
    }

    // Gerar token JWT
    const roles = userRoles;
    const payload = {
      sub: fullUser.id,
      email: fullUser.email,
      roles,
      companyId: company.id,
      companySlug: company.slug,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: fullUser,
      company,
    };
  }

  async verifyEmail(verifyEmailInput: VerifyEmailInput): Promise<VerifyEmailResponse> {
    const { token } = verifyEmailInput;

    const user = await this.userRepository.findOne({
      where: {
        verificationToken: token,
        isVerified: false,
      },
    });

    if (!user) {
      throw new BadRequestException('Token de verificação inválido ou expirado');
    }

    // Verificar se o token não expirou
    if (user.tokenExpiration && user.tokenExpiration < new Date()) {
      throw new BadRequestException('Token de verificação expirado');
    }

    // Ativar o usuário
    user.isVerified = true;
    user.isActive = true;
    user.verificationToken = undefined;
    user.tokenExpiration = undefined;

    await this.userRepository.save(user);

    // Enviar email de boas-vindas
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    return {
      success: true,
      message: 'Email verificado com sucesso! Sua conta está ativa.',
    };
  }

  async resendVerificationEmail(
    resendVerificationInput: ResendVerificationInput,
  ): Promise<VerifyEmailResponse> {
    const { email } = resendVerificationInput;

    const user = await this.userRepository.findOne({
      where: {
        email,
        isVerified: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado ou já verificado');
    }

    // Gerar novo token de verificação
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = new Date();
    tokenExpiration.setHours(tokenExpiration.getHours() + 24); // 24 horas

    user.verificationToken = verificationToken;
    user.tokenExpiration = tokenExpiration;

    await this.userRepository.save(user);

    // Enviar novo email de verificação
    const emailSent = await this.emailService.sendVerificationEmail({
      to: email,
      verificationToken,
      userName: user.name,
    });

    if (!emailSent) {
      throw new BadRequestException('Erro ao enviar email de verificação');
    }

    return {
      success: true,
      message: 'Email de verificação reenviado com sucesso!',
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'isActive', 'isVerified', 'uuid', 'name'], // Adicionar uuid e name
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Email não verificado. Verifique sua caixa de entrada.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualiza o último login
    await this.userRepository.update(user.id, { lastLogin: new Date() });

    // Buscar o usuário completo com todas as relações INCLUINDO o UUID
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });

    if (!fullUser) {
      throw new UnauthorizedException('Usuário não encontrado após validação.');
    }

    return fullUser;
  }

  async login(loginInput: LoginInput) {
    const user = await this.validateUser(loginInput.email, loginInput.password);

    // Busca as roles do usuário
    const userRoles = await this.userRoleRepository.find({
      where: { userId: user.id },
      relations: ['role'],
    });

    const roles = userRoles.map(ur => ur.role.name);

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async requestPasswordReset(
    requestPasswordResetInput: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResponse> {
    const { email } = requestPasswordResetInput;

    const user = await this.userRepository.findOne({
      where: { email, isActive: true, isVerified: true },
    });

    if (!user) {
      // Por segurança, sempre retornamos sucesso mesmo se o usuário não existir
      return {
        success: true,
        message:
          'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
      };
    }

    // Invalidar tokens de reset anteriores
    await this.passwordResetTokenRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Gerar novo token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora

    // Salvar token no banco
    const passwordResetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false,
    });

    await this.passwordResetTokenRepository.save(passwordResetToken);

    // Enviar email
    const emailSent = await this.emailService.sendPasswordResetEmail({
      to: email,
      resetToken,
      userName: user.name,
    });

    if (!emailSent) {
      throw new BadRequestException('Erro ao enviar email de recuperação');
    }

    return {
      success: true,
      message: 'Instruções para redefinir sua senha foram enviadas para seu email.',
    };
  }

  async resetPassword(resetPasswordInput: ResetPasswordInput): Promise<ResetPasswordResponse> {
    const { token, newPassword } = resetPasswordInput;

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        token,
        used: false,
      },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Token inválido ou já utilizado');
    }

    // Verificar se o token não expirou
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    // Verificar se o usuário ainda está ativo
    if (!resetToken.user.isActive || !resetToken.user.isVerified) {
      throw new BadRequestException('Usuário inativo ou não verificado');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha do usuário
    await this.userRepository.update(resetToken.user.id, {
      password: hashedPassword,
    });

    // Marcar token como usado
    resetToken.used = true;
    await this.passwordResetTokenRepository.save(resetToken);

    return {
      success: true,
      message: 'Senha redefinida com sucesso!',
    };
  }

  async assignRole(assignRoleInput: AssignRoleInput) {
    const { userId, roleId } = assignRoleInput;

    // Verifica se o usuário existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Verifica se a role existe
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException('Role não encontrada');
    }

    // Verifica se o usuário já possui esta role
    const existingUserRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (existingUserRole) {
      throw new BadRequestException('Usuário já possui esta role');
    }

    // Cria a nova associação usuário-role
    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
    });

    return this.userRoleRepository.save(userRole);
  }

  async removeRole(userId: number, roleId: number) {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw new BadRequestException('Usuário não possui esta role');
    }

    return this.userRoleRepository.remove(userRole);
  }

  async getUserRoles(userId: number) {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
  }

  async hasRole(userId: number, roleType: RoleType): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });

    return userRoles.some(userRole => userRole.role.name === roleType);
  }

  async hasAnyRole(userId: number, roleTypes: RoleType[]): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });

    return userRoles.some(userRole => roleTypes.includes(userRole.role.name));
  }
}

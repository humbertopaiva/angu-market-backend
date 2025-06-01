import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { Role, RoleType } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { LoginInput } from './dto/login.input';
import { AssignRoleInput } from './dto/assign-role.input';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'isActive'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
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

    // Retorna o usuário sem a senha
    user.password = '';
    return user;
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

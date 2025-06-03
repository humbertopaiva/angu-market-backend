// src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { Role, RoleType } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { SystemService } from '../common/config/system.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    private systemService: SystemService,
  ) {}

  async create(createUserInput: CreateUserInput, currentUser?: User): Promise<User> {
    const { email, password, roleIds, ...userData } = createUserInput;

    // Verificar se o usuário já existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso');
    }

    // Obter organização principal
    const mainOrganization = await this.systemService.getMainOrganization();

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validar permissões baseado no usuário atual
    let finalUserData = { ...userData };

    if (currentUser) {
      const currentUserRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

      if (currentUserRoles.includes(RoleType.SUPER_ADMIN)) {
        // Super admin pode criar qualquer tipo de usuário
        finalUserData.organizationId = mainOrganization.id;
      } else if (currentUserRoles.includes(RoleType.PLACE_ADMIN)) {
        // Place admin só pode criar usuários para sua própria place
        if (!currentUser.placeId) {
          throw new ForbiddenException('Usuário não está associado a um place');
        }
        finalUserData = {
          ...userData,
          organizationId: mainOrganization.id,
          placeId: currentUser.placeId,
        };
      } else {
        throw new ForbiddenException('Usuário não tem permissão para criar outros usuários');
      }
    } else {
      // Criação sem usuário atual (sistema)
      finalUserData.organizationId = mainOrganization.id;
    }

    // Cria o usuário
    const user = this.userRepository.create({
      ...finalUserData,
      email,
      password: hashedPassword,
      isVerified: true, // Usuários criados internamente são automaticamente verificados
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Atribui as roles, se fornecidas
    if (roleIds && roleIds.length > 0) {
      await this.assignRoles(savedUser.id, roleIds, currentUser);
    }

    return this.findOne(savedUser.id);
  }

  private async assignRoles(userId: number, roleIds: number[], currentUser?: User): Promise<void> {
    for (const roleId of roleIds) {
      const role = await this.roleRepository.findOne({
        where: { id: roleId },
      });

      if (role) {
        // Validar se o usuário atual pode atribuir esta role
        if (currentUser) {
          const currentUserRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

          if (!currentUserRoles.includes(RoleType.SUPER_ADMIN)) {
            // Não-super-admins não podem criar super admins
            if (role.name === RoleType.SUPER_ADMIN) {
              throw new ForbiddenException('Não é possível atribuir role de Super Admin');
            }

            // Place admins só podem criar company admins e staff
            if (currentUserRoles.includes(RoleType.PLACE_ADMIN)) {
              const allowedRoles = [
                RoleType.COMPANY_ADMIN,
                RoleType.COMPANY_STAFF,
                RoleType.PUBLIC_USER,
              ];
              if (!allowedRoles.includes(role.name)) {
                throw new ForbiddenException(`Não é possível atribuir role: ${role.name}`);
              }
            }
          }
        }

        const userRole = this.userRoleRepository.create({
          userId,
          roleId,
        });
        await this.userRoleRepository.save(userRole);
      }
    }
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException(`Usuário com e-mail ${email} não encontrado`);
    }

    return user;
  }

  async update(id: number, updateUserInput: UpdateUserInput, currentUser?: User): Promise<User> {
    const { password, roleIds, ...userData } = updateUserInput;

    // Verifica se o usuário existe
    const user = await this.findOne(id);

    // Validar permissões
    if (currentUser) {
      const currentUserRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

      if (!currentUserRoles.includes(RoleType.SUPER_ADMIN)) {
        // Não pode editar super admin
        const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
        if (userRoles.includes(RoleType.SUPER_ADMIN)) {
          throw new ForbiddenException('Não é possível editar usuário Super Admin');
        }

        // Place admin só pode editar usuários de sua place
        if (currentUserRoles.includes(RoleType.PLACE_ADMIN)) {
          if (user.placeId !== currentUser.placeId) {
            throw new ForbiddenException('Não é possível editar usuário de outro place');
          }
        }
      }
    }

    // Se estiver atualizando a senha, faz o hash
    let updatedPassword = user.password;
    if (password) {
      updatedPassword = await bcrypt.hash(password, 10);
    }

    // Atualiza o usuário
    await this.userRepository.update(id, { ...userData, password: updatedPassword });

    // Atualiza as roles, se fornecidas
    if (roleIds !== undefined) {
      // Remove todas as roles existentes
      await this.userRoleRepository.delete({ userId: id });

      // Adiciona as novas roles
      if (roleIds.length > 0) {
        await this.assignRoles(id, roleIds, currentUser);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number, currentUser?: User): Promise<User> {
    const user = await this.findOne(id);

    // Validar permissões
    if (currentUser) {
      const currentUserRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

      if (!currentUserRoles.includes(RoleType.SUPER_ADMIN)) {
        // Não pode deletar super admin
        const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
        if (userRoles.includes(RoleType.SUPER_ADMIN)) {
          throw new ForbiddenException('Não é possível remover usuário Super Admin');
        }

        // Place admin só pode remover usuários de sua place
        if (currentUserRoles.includes(RoleType.PLACE_ADMIN)) {
          if (user.placeId !== currentUser.placeId) {
            throw new ForbiddenException('Não é possível remover usuário de outro place');
          }
        }
      }
    }

    // Remove todas as roles do usuário
    await this.userRoleRepository.delete({ userId: id });

    // Remove o usuário
    await this.userRepository.remove(user);

    return user;
  }

  // Métodos para listagem por contexto
  async findByPlace(placeId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { placeId },
      relations: ['company', 'userRoles', 'userRoles.role'],
    });
  }

  async findByCompany(companyId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { companyId },
      relations: ['userRoles', 'userRoles.role'],
    });
  }
}

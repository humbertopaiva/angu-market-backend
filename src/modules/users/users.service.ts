import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { Role } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async create(createUserInput: CreateUserInput): Promise<User> {
    const { email, password, roleIds, ...userData } = createUserInput;

    // Verifica se o usuário já existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria o usuário
    const user = this.userRepository.create({
      ...userData,
      email,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Atribui as roles, se fornecidas
    if (roleIds && roleIds.length > 0) {
      for (const roleId of roleIds) {
        const role = await this.roleRepository.findOne({
          where: { id: roleId },
        });

        if (role) {
          const userRole = this.userRoleRepository.create({
            userId: savedUser.id,
            roleId,
          });
          await this.userRoleRepository.save(userRole);
        }
      }
    }

    return this.findOne(savedUser.id);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
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

  async update(id: number, updateUserInput: UpdateUserInput): Promise<User> {
    const { password, roleIds, ...userData } = updateUserInput;

    // Verifica se o usuário existe
    const user = await this.findOne(id);

    // Se estiver atualizando a senha, faz o hash
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Atualiza o usuário
    await this.userRepository.update(id, { ...userData, password: user.password });

    // Atualiza as roles, se fornecidas
    if (roleIds && roleIds.length > 0) {
      // Remove todas as roles existentes
      await this.userRoleRepository.delete({ userId: id });

      // Adiciona as novas roles
      for (const roleId of roleIds) {
        const role = await this.roleRepository.findOne({
          where: { id: roleId },
        });

        if (role) {
          const userRole = this.userRoleRepository.create({
            userId: id,
            roleId,
          });
          await this.userRoleRepository.save(userRole);
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<User> {
    const user = await this.findOne(id);

    // Remove todas as roles do usuário
    await this.userRoleRepository.delete({ userId: id });

    // Remove o usuário
    await this.userRepository.remove(user);

    return user;
  }
}

// src/modules/companies/companies.service.ts - COMPLETO COM HIERARQUIA DE SEGMENTAÇÃO
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Company } from './entities/company.entity';
import { UpdateCompanyInput } from './dto/update-company.input';
import { User } from '../users/entities/user.entity';
import { Role, RoleType } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { CreateCompanyInput } from './dto/create-company.input';
// Importações de segmentação
import { Segment } from '../segments/entities/segment.entity';
import { Category } from '../segments/entities/company-category.entity';
import { Subcategory } from '../segments/entities/company-subcategory.entity';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    // Repositórios de segmentação
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    this.logger.debug('=== VALIDATE PLACE ACCESS DEBUG START ===');
    this.logger.debug('PlaceId:', placeId);
    this.logger.debug('User:', {
      id: user?.id,
      email: user?.email,
      placeId: user?.placeId,
      userRoles:
        user?.userRoles?.map(ur => ({
          id: ur.id,
          roleId: ur.roleId,
          roleName: ur.role?.name,
        })) || 'no userRoles',
    });

    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    this.logger.debug('Extracted user roles:', userRoles);

    // Super admin pode acessar qualquer place
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      this.logger.debug('User is SUPER_ADMIN, access granted');
      return;
    }

    // Place admin só pode gerenciar empresas de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      this.logger.debug('User is PLACE_ADMIN, checking place access');
      this.logger.debug('User placeId:', user.placeId);
      this.logger.debug('Requested placeId:', placeId);

      if (user.placeId !== placeId) {
        this.logger.error('Place admin trying to access different place');
        throw new ForbiddenException('Você não tem permissão para gerenciar empresas deste place');
      }
      this.logger.debug('Place admin has access to this place');
      return;
    }

    this.logger.error('User has no valid roles for company management');
    throw new ForbiddenException('Você não tem permissão para gerenciar empresas');
  }

  /**
   * Validar hierarquia completa de segmentação
   * Cada empresa DEVE ter: Segmento → Categoria → Subcategoria
   */
  private async validateCompleteSegmentationHierarchy(
    segmentId: number,
    categoryId: number,
    subcategoryId: number,
    placeId: number,
  ): Promise<void> {
    this.logger.debug('=== VALIDATE COMPLETE SEGMENTATION HIERARCHY ===');
    this.logger.debug('SegmentId:', segmentId);
    this.logger.debug('CategoryId:', categoryId);
    this.logger.debug('SubcategoryId:', subcategoryId);
    this.logger.debug('PlaceId:', placeId);

    // 1. Validar que o segmento existe e pertence ao place
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId, placeId },
      relations: ['place'],
    });

    if (!segment) {
      throw new BadRequestException(`Segmento com ID ${segmentId} não encontrado neste place`);
    }

    // 2. Validar que a categoria existe, pertence ao place E ao segmento
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, placeId },
      relations: ['place', 'segments'],
    });

    if (!category) {
      throw new BadRequestException(`Categoria com ID ${categoryId} não encontrada neste place`);
    }

    // Verificar se a categoria pertence ao segmento selecionado
    const categoryBelongsToSegment = category.segments?.some(seg => seg.id === segmentId);

    if (!categoryBelongsToSegment) {
      throw new BadRequestException(
        `A categoria "${category.name}" não pertence ao segmento "${segment.name}"`,
      );
    }

    // 3. Validar que a subcategoria existe, pertence ao place E à categoria
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id: subcategoryId, placeId, categoryId },
      relations: ['place', 'category'],
    });

    if (!subcategory) {
      throw new BadRequestException(
        `Subcategoria com ID ${subcategoryId} não encontrada nesta categoria e place`,
      );
    }

    // Verificar consistência da hierarquia
    if (subcategory.categoryId !== categoryId) {
      throw new BadRequestException(
        `A subcategoria "${subcategory.name}" não pertence à categoria "${category.name}"`,
      );
    }

    this.logger.debug('Complete segmentation hierarchy validation passed');
    this.logger.debug(`Hierarchy: ${segment.name} → ${category.name} → ${subcategory.name}`);
  }

  async create(createCompanyInput: CreateCompanyInput, currentUser: User): Promise<Company> {
    this.logger.debug('=== CREATE COMPANY DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);
    this.logger.debug('CurrentUser:', {
      id: currentUser?.id,
      email: currentUser?.email,
      placeId: currentUser?.placeId,
    });

    const { slug, placeId, segmentId, categoryId, subcategoryId, ...companyData } =
      createCompanyInput;

    try {
      // Validar acesso ao place
      this.logger.debug('Validating place access...');
      this.validatePlaceAccess(placeId, currentUser);
      this.logger.debug('Place access validated successfully');

      // VALIDAÇÃO OBRIGATÓRIA: Hierarquia completa de segmentação
      this.logger.debug('Validating complete segmentation hierarchy...');
      await this.validateCompleteSegmentationHierarchy(
        segmentId,
        categoryId,
        subcategoryId,
        placeId,
      );
      this.logger.debug('Complete segmentation hierarchy validated successfully');

      // Verificar se já existe uma empresa com o mesmo slug
      this.logger.debug('Checking for existing company with slug:', slug);
      const existingCompany = await this.companyRepository.findOne({
        where: { slug },
      });

      if (existingCompany) {
        this.logger.error('Company with slug already exists:', slug);
        throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
      }
      this.logger.debug('No existing company found with slug:', slug);

      // Filtrar campos undefined/null antes de criar
      const cleanedData = Object.fromEntries(
        Object.entries(companyData).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      );

      // Se latitude/longitude são 0, remover para não causar problemas
      if (cleanedData.latitude === 0) delete cleanedData.latitude;
      if (cleanedData.longitude === 0) delete cleanedData.longitude;

      this.logger.debug('Cleaned company data:', cleanedData);

      // Criar empresa com hierarquia completa OBRIGATÓRIA
      const company = this.companyRepository.create({
        ...cleanedData,
        slug,
        placeId,
        segmentId, // OBRIGATÓRIO
        categoryId, // OBRIGATÓRIO
        subcategoryId, // OBRIGATÓRIO
      });

      this.logger.debug('Company entity created, saving...');
      const savedCompany = await this.companyRepository.save(company);

      this.logger.debug('Company saved successfully with complete segmentation:', {
        id: savedCompany.id,
        name: savedCompany.name,
        slug: savedCompany.slug,
        placeId: savedCompany.placeId,
        segmentId: savedCompany.segmentId,
        categoryId: savedCompany.categoryId,
        subcategoryId: savedCompany.subcategoryId,
      });

      // Buscar empresa completa com todos os relacionamentos de segmentação
      const completeCompany = await this.companyRepository.findOne({
        where: { id: savedCompany.id },
        relations: [
          'place',
          'segment',
          'category',
          'category.segments',
          'subcategory',
          'subcategory.category',
          'subcategory.category.segments',
        ],
      });

      this.logger.debug('=== CREATE COMPANY DEBUG END ===');
      return completeCompany || savedCompany;
    } catch (error) {
      this.logger.error('=== CREATE COMPANY ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Novo método para criar empresa com usuários
  async createWithUsers(
    createCompanyInput: CreateCompanyInput,
    currentUser: User,
  ): Promise<Company> {
    this.logger.debug('=== CREATE COMPANY WITH USERS DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);

    const { users, ...companyData } = createCompanyInput;

    try {
      // Criar a empresa primeiro (usar método existente que já valida hierarquia)
      const company = await this.create(companyData as CreateCompanyInput, currentUser);
      this.logger.debug('Company created:', { id: company.id, name: company.name });

      // Processar usuários se fornecidos
      if (users && users.length > 0) {
        await this.processCompanyUsers(users, company.id);
      }

      // Retornar empresa completa com usuários
      const completeCompany = await this.companyRepository.findOne({
        where: { id: company.id },
        relations: {
          place: true,
          segment: true,
          category: {
            segments: true,
          },
          subcategory: {
            category: {
              segments: true,
            },
          },
          users: {
            userRoles: {
              role: true,
            },
          },
        },
      });

      this.logger.debug('=== CREATE COMPANY WITH USERS DEBUG END ===');
      return completeCompany || company;
    } catch (error) {
      this.logger.error('=== CREATE COMPANY WITH USERS ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

  private async processCompanyUsers(users: any[], companyId: number): Promise<void> {
    this.logger.debug('Processing company users:', { count: users.length, companyId });

    for (const userData of users) {
      try {
        if (userData.existingUserId) {
          // Atribuir usuário existente à empresa
          await this.assignExistingUserToCompany(userData.existingUserId, companyId);
        } else if (userData.name && userData.email && userData.password) {
          // Criar novo usuário para a empresa
          await this.createNewUserForCompany(userData, companyId);
        }
      } catch (error) {
        this.logger.error(`Error processing user: ${error.message}`);
        // Continuar processando outros usuários mesmo se um falhar
      }
    }
  }

  private async assignExistingUserToCompany(userId: number, companyId: number): Promise<void> {
    this.logger.debug('Assigning existing user to company:', { userId, companyId });

    // Buscar o usuário
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new BadRequestException(`Usuário com ID ${userId} não encontrado`);
    }

    // Buscar a empresa para verificar o place
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['place'],
    });

    if (!company) {
      throw new BadRequestException(`Empresa com ID ${companyId} não encontrada`);
    }

    // Validar que o usuário é do mesmo place
    if (user.placeId !== company.placeId) {
      throw new BadRequestException('Usuário deve ser do mesmo place da empresa');
    }

    // Atualizar o usuário para ser da empresa
    await this.userRepository.update(userId, { companyId });



   

    this.logger.debug('User assigned to company successfully');
  }

  private async createNewUserForCompany(userData: any, companyId: number): Promise<void> {
    this.logger.debug('Creating new user for company:', {
      userData: { ...userData, password: '[HIDDEN]' },
      companyId,
    });

    // Verificar se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new BadRequestException(`Usuário com email ${userData.email} já existe`);
    }

    // Buscar empresa para obter placeId e organizationId
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['place', 'place.organization'],
    });

    if (!company) {
      throw new BadRequestException(`Empresa com ID ${companyId} não encontrada`);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Criar o usuário
    const user = this.userRepository.create({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      phone: userData.phone || null,
      isVerified: true, // Usuários criados por admin são verificados automaticamente
      isActive: userData.isActive !== false,
      organizationId: company.place.organization?.id || company.place.organizationId,
      placeId: company.placeId,
      companyId: companyId,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.debug('User created:', { id: savedUser.id, email: savedUser.email });

    // Atribuir role apropriada
    const roleName =
      userData.role 
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (role) {
      const userRole = this.userRoleRepository.create({
        userId: savedUser.id,
        roleId: role.id,
      });
      await this.userRoleRepository.save(userRole);
      this.logger.debug('Role assigned:', { userId: savedUser.id, roleName });
    }
  }

  // Método para buscar usuários disponíveis para uma empresa (mesmo place)
  async getAvailableUsersForCompany(placeId: number): Promise<User[]> {
    return this.userRepository.find({
      where: {
        placeId,
        companyId: IsNull(),
        isActive: true,
      },
      relations: ['userRoles', 'userRoles.role'],
      order: { name: 'ASC' },
    });
  }

  async findAll(): Promise<Company[]> {
    this.logger.debug('=== FIND ALL COMPANIES DEBUG START ===');

    try {
      const companies = await this.companyRepository.find({
        relations: {
          place: true,
          // Incluir toda a hierarquia de segmentação
          segment: true,
          category: {
            segments: true,
          },
          subcategory: {
            category: {
              segments: true,
            },
          },
          users: {
            userRoles: {
              role: true,
            },
          },
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.debug(`Found ${companies.length} companies`);

      // Log das empresas encontradas para debug
      companies.forEach((company, index) => {
        this.logger.debug(`Company ${index + 1}:`, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          placeId: company.placeId,
          placeName: company.place?.name || 'No place loaded',
          segmentId: company.segmentId,
          segmentName: company.segment?.name || 'No segment',
          categoryId: company.categoryId,
          categoryName: company.category?.name || 'No category',
          subcategoryId: company.subcategoryId,
          subcategoryName: company.subcategory?.name || 'No subcategory',
          usersCount: company.users?.length || 0,
          adminsCount:
            company.users?.filter(user =>
              user.userRoles?.some(ur => ur.role.name === RoleType.COMPANY_ADMIN),
            ).length || 0,
          isActive: company.isActive,
        });
      });

      this.logger.debug('=== FIND ALL COMPANIES DEBUG END ===');
      return companies;
    } catch (error) {
      this.logger.error('=== FIND ALL COMPANIES ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Company> {
    this.logger.debug('=== FIND ONE COMPANY DEBUG START ===');
    this.logger.debug('Company ID:', id);

    const company = await this.companyRepository.findOne({
      where: { id },
      relations: {
        place: true,
        // Incluir toda a hierarquia de segmentação
        segment: true,
        category: {
          segments: true,
        },
        subcategory: {
          category: {
            segments: true,
          },
        },
        users: {
          userRoles: {
            role: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    this.logger.debug('Company found:', {
      id: company.id,
      name: company.name,
      segmentName: company.segment?.name,
      categoryName: company.category?.name,
      subcategoryName: company.subcategory?.name,
      usersCount: company.users?.length || 0,
      adminsCount:
        company.users?.filter(user =>
          user.userRoles?.some(ur => ur.role.name === RoleType.COMPANY_ADMIN),
        ).length || 0,
    });

    this.logger.debug('=== FIND ONE COMPANY DEBUG END ===');
    return company;
  }

  async findBySlug(slug: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { slug },
      relations: {
        place: true,
        segment: true,
        category: {
          segments: true,
        },
        subcategory: {
          category: {
            segments: true,
          },
        },
        users: {
          userRoles: {
            role: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa com slug ${slug} não encontrada`);
    }

    return company;
  }

  async findByPlace(placeId: number): Promise<Company[]> {
    this.logger.debug('=== FIND BY PLACE DEBUG START ===');
    this.logger.debug('Place ID:', placeId);

    const companies = await this.companyRepository.find({
      where: { placeId },
      relations: {
        place: true,
        segment: true,
        category: {
          segments: true,
        },
        subcategory: {
          category: {
            segments: true,
          },
        },
        users: {
          userRoles: {
            role: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    this.logger.debug(`Found ${companies.length} companies for place ${placeId}`);

    // Log das empresas por place
    companies.forEach((company, index) => {
      this.logger.debug(`Company ${index + 1} in place:`, {
        id: company.id,
        name: company.name,
        segmentName: company.segment?.name,
        categoryName: company.category?.name,
        subcategoryName: company.subcategory?.name,
        usersCount: company.users?.length || 0,
        adminsCount:
          company.users?.filter(user =>
            user.userRoles?.some(ur => ur.role.name === RoleType.COMPANY_ADMIN),
          ).length || 0,
      });
    });

    this.logger.debug('=== FIND BY PLACE DEBUG END ===');
    return companies;
  }

  async findByUser(user: User): Promise<Company[]> {
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

    // Super admin pode ver todas
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      return this.findAll();
    }

    // Place admin pode ver todas do seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN) && user.placeId) {
      return this.findByPlace(user.placeId);
    }

    // Company admin/staff pode ver apenas sua empresa
    if (user.companyId) {
      const company = await this.findOne(user.companyId);
      return [company];
    }

    return [];
  }

  async update(
    id: number,
    updateCompanyInput: UpdateCompanyInput,
    currentUser: User,
  ): Promise<Company> {
    const { slug, placeId, segmentId, categoryId, subcategoryId } = updateCompanyInput;

    // Verifica se a empresa existe
    const company = await this.findOne(id);

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    // Se está atualizando o place, validar acesso ao novo place também
    if (placeId && placeId !== company.placeId) {
      this.validatePlaceAccess(placeId, currentUser);
    }

    // Se está atualizando qualquer campo de segmentação, validar hierarquia completa
    if (segmentId !== undefined || categoryId !== undefined || subcategoryId !== undefined) {
      const finalSegmentId = segmentId || company.segmentId;
      const finalCategoryId = categoryId || company.categoryId;
      const finalSubcategoryId = subcategoryId || company.subcategoryId;
      const finalPlaceId = placeId || company.placeId;

      await this.validateCompleteSegmentationHierarchy(
        finalSegmentId,
        finalCategoryId,
        finalSubcategoryId,
        finalPlaceId,
      );
    }

    // Se está atualizando o slug, verifica se já existe outra empresa com o mesmo slug
    if (slug && slug !== company.slug) {
      const existingCompany = await this.companyRepository.findOne({
        where: { slug },
      });

      if (existingCompany && existingCompany.id !== id) {
        throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
      }
    }

    await this.companyRepository.update(id, updateCompanyInput);
    return this.findOne(id);
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY DEBUG START ===');
    this.logger.debug('Company ID to remove:', id);

    // Buscar a empresa para validar acesso
    const company = await this.findOne(id);
    this.logger.debug('Company found for deletion:', {
      id: company.id,
      name: company.name,
      slug: company.slug,
    });

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    // Deletar a empresa
    await this.companyRepository.remove(company);

    this.logger.debug('Company removed successfully');
    this.logger.debug('=== REMOVE COMPANY DEBUG END ===');
  }

  /**
   * Atribuir um usuário como admin de uma empresa
   */
   /**
   * Atribuir um usuário como admin de uma empresa
   */
  async assignCompanyAdmin(companyId: number, userId: number, currentUser: User): Promise<Company> {
    this.logger.debug('=== ASSIGN COMPANY ADMIN SERVICE DEBUG START ===');
    this.logger.debug('Company ID:', companyId);
    this.logger.debug('User ID:', userId);

    try {
      // Buscar a empresa
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: ['place'],
      });

      if (!company) {
        throw new BadRequestException(`Empresa com ID ${companyId} não encontrada`);
      }

      // Validar acesso ao place da empresa
      this.validatePlaceAccess(company.placeId, currentUser);

      // Buscar o usuário
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!user) {
        throw new BadRequestException(`Usuário com ID ${userId} não encontrado`);
      }

      // Validar que o usuário é do mesmo place
      if (user.placeId !== company.placeId) {
        throw new BadRequestException('Usuário deve ser do mesmo place da empresa');
      }

      // Verificar se o usuário já tem uma empresa
      if (user.companyId && user.companyId !== companyId) {
        throw new BadRequestException('Usuário já está associado a outra empresa');
      }

      // Buscar a role de COMPANY_ADMIN
      const adminRole = await this.roleRepository.findOne({
        where: { name: RoleType.COMPANY_ADMIN },
      });

      if (!adminRole) {
        throw new BadRequestException('Role de COMPANY_ADMIN não encontrada');
      }

      // Remover roles de empresa existentes (somente COMPANY_ADMIN agora)
      const existingCompanyRoles =
        user.userRoles?.filter(ur =>
          ur.role.name === RoleType.COMPANY_ADMIN
        ) || [];

      for (const userRole of existingCompanyRoles) {
        await this.userRoleRepository.remove(userRole);
      }

      // Atribuir a empresa ao usuário
      await this.userRepository.update(userId, { companyId });

      // Atribuir a role de COMPANY_ADMIN
      const newUserRole = this.userRoleRepository.create({
        userId,
        roleId: adminRole.id,
      });
      await this.userRoleRepository.save(newUserRole);

      this.logger.debug('Company admin assigned successfully');

      // Retornar empresa completa com relacionamentos
      return this.findOne(companyId);
    } catch (error) {
      this.logger.error('=== ASSIGN COMPANY ADMIN SERVICE ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

  /**
   * Remover um usuário como admin de uma empresa
   */
  async removeCompanyAdmin(companyId: number, userId: number, currentUser: User): Promise<Company> {
    this.logger.debug('=== REMOVE COMPANY ADMIN SERVICE DEBUG START ===');
    this.logger.debug('Company ID:', companyId);
    this.logger.debug('User ID:', userId);

    try {
      // Buscar a empresa
      const company = await this.findOne(companyId);

      // Validar acesso ao place da empresa
      this.validatePlaceAccess(company.placeId, currentUser);

      // Buscar o usuário
      const user = await this.userRepository.findOne({
        where: { id: userId, companyId },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!user) {
        throw new BadRequestException('Usuário não é admin desta empresa');
      }

      // Remover role de COMPANY_ADMIN
      const companyAdminRole = user.userRoles?.find(ur => 
        ur.role.name === RoleType.COMPANY_ADMIN
      );

      if (companyAdminRole) {
        await this.userRoleRepository.remove(companyAdminRole);
      }

      // Remover associação com a empresa
      await this.userRepository.update(userId, { companyId: undefined });

      // Buscar role de PUBLIC_USER para atribuir ao usuário
      const publicRole = await this.roleRepository.findOne({
        where: { name: RoleType.PUBLIC_USER },
      });

      if (publicRole) {
        const newUserRole = this.userRoleRepository.create({
          userId,
          roleId: publicRole.id,
        });
        await this.userRoleRepository.save(newUserRole);
      }

      this.logger.debug('Company admin removed successfully');

      // Retornar empresa completa com relacionamentos
      return this.findOne(companyId);
    } catch (error) {
      this.logger.error('=== REMOVE COMPANY ADMIN SERVICE ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

   /**
   * Buscar usuários disponíveis para serem admin de empresa
   */
  async getAvailableCompanyAdmins(placeId: number): Promise<User[]> {
    this.logger.debug('Getting available company admins for place:', placeId);

    try {
      // Buscar usuários do place que:
      // 1. Não têm empresa associada OU
      // 2. Não têm roles administrativas de nível superior (SUPER_ADMIN, PLACE_ADMIN)
      const users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userRoles', 'userRole')
        .leftJoinAndSelect('userRole.role', 'role')
        .leftJoinAndSelect('user.company', 'company')
        .where('user.placeId = :placeId', { placeId })
        .andWhere('user.isActive = true')
        .getMany();

      const availableUsers = users.filter(user => {
        const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
        
        // Não pode ter roles administrativas superiores
        const hasHigherAdminRole = userRoles.some(role => 
          [RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN].includes(role)
        );

        if (hasHigherAdminRole) {
          return false;
        }

        // Pode estar sem empresa ou já ser admin de alguma empresa
        return true;
      });

      return availableUsers;
    } catch (error) {
      this.logger.error('Error getting available company admins:', error.message);
      throw error;
    }
  }

  /**
   * Buscar empresas que não têm admin
   */
  async getCompaniesWithoutAdmin(placeId?: number): Promise<Company[]> {
    this.logger.debug('Getting companies without admin');

    try {
      let query = this.companyRepository
        .createQueryBuilder('company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoin('company.users', 'user')
        .leftJoin('user.userRoles', 'userRole')
        .leftJoin('userRole.role', 'role')
        .where('role.name = :roleName OR role.name IS NULL', { roleName: RoleType.COMPANY_ADMIN })
        .groupBy('company.id')
        .addGroupBy('place.id')
        .having('COUNT(CASE WHEN role.name = :roleName THEN 1 END) = 0', {
          roleName: RoleType.COMPANY_ADMIN,
        })
        .orderBy('company.name', 'ASC');

      if (placeId) {
        query = query.andWhere('company.placeId = :placeId', { placeId });
      }

      const companies = await query.getMany();
      this.logger.debug(`Found ${companies.length} companies without admin`);
      return companies;
    } catch (error) {
      this.logger.error('Error getting companies without admin:', error.message);
      throw error;
    }
  }

  /**
   * Buscar empresa com todos os detalhes dos usuários e roles
   * Método específico para gestão de admins
   */
  async findOneWithUsersDetails(id: number): Promise<Company> {
    this.logger.debug('=== FIND ONE WITH USERS DETAILS DEBUG START ===');
    this.logger.debug('Company ID:', id);

    const company = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.place', 'place')
      .leftJoinAndSelect('company.segment', 'segment')
      .leftJoinAndSelect('company.category', 'category')
      .leftJoinAndSelect('category.segments', 'categorySegments')
      .leftJoinAndSelect('company.subcategory', 'subcategory')
      .leftJoinAndSelect('subcategory.category', 'subcategoryCategory')
      .leftJoinAndSelect('subcategoryCategory.segments', 'subcategoryCategorySegments')
      .leftJoinAndSelect('company.users', 'user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('user.company', 'userCompany')
      .where('company.id = :id', { id })
      .andWhere('user.isActive = :isActive OR user.id IS NULL', { isActive: true })
      .andWhere('userRole.isActive = :roleActive OR userRole.id IS NULL', { roleActive: true })
      .getOne();

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    this.logger.debug('Company found with users details:', {
      id: company.id,
      name: company.name,
      segmentName: company.segment?.name,
      categoryName: company.category?.name,
      subcategoryName: company.subcategory?.name,
      usersCount: company.users?.length || 0,
    });

    // Debug dos usuários e suas roles
    if (company.users) {
      company.users.forEach((user, index) => {
        const roles = user.userRoles?.map(ur => ur.role?.name).filter(Boolean) || [];
        this.logger.debug(`User ${index + 1}:`, {
          id: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
          rolesCount: user.userRoles?.length || 0,
          roles: roles,
          isAdmin: roles.includes(RoleType.COMPANY_ADMIN),
   
        });
      });
    }

    this.logger.debug('=== FIND ONE WITH USERS DETAILS DEBUG END ===');
    return company;
  }

  /**
   * Buscar empresas por segmento
   */
  async findBySegment(segmentId: number): Promise<Company[]> {
    this.logger.debug('=== FIND COMPANIES BY SEGMENT ===');
    this.logger.debug('Segment ID:', segmentId);

    const companies = await this.companyRepository.find({
      where: { segmentId },
      relations: {
        place: true,
        segment: true,
        category: {
          segments: true,
        },
        subcategory: {
          category: {
            segments: true,
          },
        },
        users: {
          userRoles: {
            role: true,
          },
        },
      },
      order: {
        name: 'ASC',
      },
    });

    this.logger.debug(`Found ${companies.length} companies for segment ${segmentId}`);
    return companies;
  }

  /**
   * Buscar empresas por categoria
   */
  async findByCategory(categoryId: number): Promise<Company[]> {
    this.logger.debug('=== FIND COMPANIES BY CATEGORY ===');
    this.logger.debug('Category ID:', categoryId);

    const companies = await this.companyRepository.find({
      where: { categoryId },
      relations: {
        place: true,
        segment: true,
        category: {
          segments: true,
        },
        subcategory: {
          category: {
            segments: true,
          },
        },
        users: {
          userRoles: {
            role: true,
          },
        },
      },
      order: {
        name: 'ASC',
      },
    });

    this.logger.debug(`Found ${companies.length} companies for category ${categoryId}`);
    return companies;
  }

  /**
   * Buscar empresas por subcategoria
   */
  async findBySubcategory(subcategoryId: number): Promise<Company[]> {
    this.logger.debug('=== FIND COMPANIES BY SUBCATEGORY ===');
    this.logger.debug('Subcategory ID:', subcategoryId);

    const companies = await this.companyRepository.find({
      where: { subcategoryId },
      relations: {
        place: true,
        segment: true,
        category: {
          segments: true,
        },
        subcategory: {
          category: {
            segments: true,
          },
        },
        users: {
          userRoles: {
            role: true,
          },
        },
      },
      order: {
        name: 'ASC',
      },
    });

    this.logger.debug(`Found ${companies.length} companies for subcategory ${subcategoryId}`);
    return companies;
  }

  /**
   * Buscar empresas sem segmentação completa (para relatórios)
   */
  async findCompaniesWithIncompleteSegmentation(): Promise<Company[]> {
    this.logger.debug('=== FIND COMPANIES WITH INCOMPLETE SEGMENTATION ===');

    // Esta query não deveria retornar nenhuma empresa se a validação estiver funcionando corretamente
    // mas é útil para relatórios e verificação de integridade
    const companies = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.place', 'place')
      .leftJoinAndSelect('company.segment', 'segment')
      .leftJoinAndSelect('company.category', 'category')
      .leftJoinAndSelect('company.subcategory', 'subcategory')
      .where(
        'company.segmentId IS NULL OR company.categoryId IS NULL OR company.subcategoryId IS NULL',
      )
      .getMany();

    this.logger.debug(`Found ${companies.length} companies with incomplete segmentation`);

    if (companies.length > 0) {
      this.logger.warn('WARNING: Found companies with incomplete segmentation hierarchy!');
      companies.forEach(company => {
        this.logger.warn(`Company ${company.id} (${company.name}) missing:`, {
          segmentId: company.segmentId || 'MISSING',
          categoryId: company.categoryId || 'MISSING',
          subcategoryId: company.subcategoryId || 'MISSING',
        });
      });
    }

    return companies;
  }

  /**
   * Obter estatísticas de segmentação
   */
  async getSegmentationStats(placeId?: number): Promise<{
    totalCompanies: number;
    bySegment: Record<string, number>;
    byCategory: Record<string, number>;
    bySubcategory: Record<string, number>;
    incompleteSegmentation: number;
  }> {
    this.logger.debug('=== GET SEGMENTATION STATS ===');

    let companies: Company[];

    if (placeId) {
      companies = await this.findByPlace(placeId);
    } else {
      companies = await this.findAll();
    }

    const stats = {
      totalCompanies: companies.length,
      bySegment: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      bySubcategory: {} as Record<string, number>,
      incompleteSegmentation: 0,
    };

    companies.forEach(company => {
      // Verificar se tem segmentação completa
      if (!company.segmentId || !company.categoryId || !company.subcategoryId) {
        stats.incompleteSegmentation++;
        return;
      }

      // Estatísticas por segmento
      const segmentName = company.segment?.name || 'Segment not loaded';
      stats.bySegment[segmentName] = (stats.bySegment[segmentName] || 0) + 1;

      // Estatísticas por categoria
      const categoryName = company.category?.name || 'Category not loaded';
      stats.byCategory[categoryName] = (stats.byCategory[categoryName] || 0) + 1;

      // Estatísticas por subcategoria
      const subcategoryName = company.subcategory?.name || 'Subcategory not loaded';
      stats.bySubcategory[subcategoryName] = (stats.bySubcategory[subcategoryName] || 0) + 1;
    });

    this.logger.debug('Segmentation stats:', stats);
    return stats;
  }
}

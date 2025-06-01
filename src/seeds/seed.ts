import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { Place } from '../modules/places/entities/place.entity';
import { Company } from '../modules/companies/entities/company.entity';
import { User } from '../modules/users/entities/user.entity';
import { Role, RoleType } from '../modules/auth/entities/role.entity';
import { UserRole } from '../modules/auth/entities/user-role.entity';

config();

async function main() {
  console.log('Seeding database...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'angu_market',
    entities: [Organization, Place, Company, User, Role, UserRole],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Obter roles
    const superAdminRole = await dataSource.manager.findOne(Role, {
      where: { name: RoleType.SUPER_ADMIN },
    });
    const orgAdminRole = await dataSource.manager.findOne(Role, {
      where: { name: RoleType.ORGANIZATION_ADMIN },
    });
    const placeAdminRole = await dataSource.manager.findOne(Role, {
      where: { name: RoleType.PLACE_ADMIN },
    });
    const companyAdminRole = await dataSource.manager.findOne(Role, {
      where: { name: RoleType.COMPANY_ADMIN },
    });
    const publicUserRole = await dataSource.manager.findOne(Role, {
      where: { name: RoleType.PUBLIC_USER },
    });

    if (
      !superAdminRole ||
      !orgAdminRole ||
      !placeAdminRole ||
      !companyAdminRole ||
      !publicUserRole
    ) {
      throw new Error('Roles não encontradas. Execute a migração primeiro.');
    }

    // Criar organização
    const organization = dataSource.manager.create(Organization, {
      name: 'Angu Market',
      slug: 'angu-market',
      description: 'Marketplace local para produtos e serviços',
      logo: 'https://placeholder.com/logo.png',
      banner: 'https://placeholder.com/banner.png',
    });

    await dataSource.manager.save(organization);
    console.log('Organização criada');

    // Criar place
    const place = dataSource.manager.create(Place, {
      name: 'Juiz de Fora',
      slug: 'juiz-de-fora',
      description: 'Cidade de Juiz de Fora',
      city: 'Juiz de Fora',
      state: 'MG',
      organizationId: organization.id,
      latitude: -21.7613,
      longitude: -43.3495,
    });

    await dataSource.manager.save(place);
    console.log('Place criado');

    // Criar empresa
    const company = dataSource.manager.create(Company, {
      name: 'Loja Demo',
      slug: 'loja-demo',
      description: 'Loja demonstrativa para o sistema',
      placeId: place.id,
      address: 'Rua Principal, 123',
      phone: '(32) 3333-3333',
      email: 'contato@lojademo.com',
    });

    await dataSource.manager.save(company);
    console.log('Empresa criada');

    // Criar usuário super admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const superAdmin = dataSource.manager.create(User, {
      name: 'Super Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: true,
      organizationId: organization.id,
    });

    await dataSource.manager.save(superAdmin);
    console.log('Usuário super admin criado');

    // Atribuir role de super admin
    const superAdminUserRole = dataSource.manager.create(UserRole, {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    });

    await dataSource.manager.save(superAdminUserRole);

    // Criar usuário admin de place
    const placeAdmin = dataSource.manager.create(User, {
      name: 'Admin do Place',
      email: 'place@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: true,
      organizationId: organization.id,
      placeId: place.id,
    });

    await dataSource.manager.save(placeAdmin);
    console.log('Usuário admin de place criado');

    // Atribuir role de admin de place
    const placeAdminUserRole = dataSource.manager.create(UserRole, {
      userId: placeAdmin.id,
      roleId: placeAdminRole.id,
    });

    await dataSource.manager.save(placeAdminUserRole);

    // Criar usuário admin de empresa
    const companyAdmin = dataSource.manager.create(User, {
      name: 'Admin da Empresa',
      email: 'company@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: true,
      organizationId: organization.id,
      placeId: place.id,
      companyId: company.id,
    });

    await dataSource.manager.save(companyAdmin);
    console.log('Usuário admin de empresa criado');

    // Atribuir role de admin de empresa
    const companyAdminUserRole = dataSource.manager.create(UserRole, {
      userId: companyAdmin.id,
      roleId: companyAdminRole.id,
    });

    await dataSource.manager.save(companyAdminUserRole);

    // Criar usuário público
    const publicUser = dataSource.manager.create(User, {
      name: 'Usuário Público',
      email: 'user@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: true,
    });

    await dataSource.manager.save(publicUser);
    console.log('Usuário público criado');

    // Atribuir role de usuário público
    const publicUserUserRole = dataSource.manager.create(UserRole, {
      userId: publicUser.id,
      roleId: publicUserRole.id,
    });

    await dataSource.manager.save(publicUserUserRole);

    console.log('Seed concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar seed:', error);
  } finally {
    await dataSource.destroy();
  }
}

main();

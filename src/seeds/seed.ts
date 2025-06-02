import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { Place } from '../modules/places/entities/place.entity';
import { Company } from '../modules/companies/entities/company.entity';
import { User } from '../modules/users/entities/user.entity';
import { Role, RoleType } from '../modules/auth/entities/role.entity';
import { UserRole } from '../modules/auth/entities/user-role.entity';
import { Segment } from '../modules/segments/entities/segment.entity';
import { Category } from '@/modules/segments/entities/company-category.entity';
import { Subcategory } from '@/modules/segments/entities/company-subcategory.entity';

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
    entities: [Organization, Place, Company, User, Role, UserRole, Segment, Category, Subcategory],
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

    // Buscar segmentos, categorias e subcategorias criados pela migração

    const casaCategory = await dataSource.manager.findOne(Category, {
      where: { slug: 'casa-construcao' },
    });
    const restaurantesCategory = await dataSource.manager.findOne(Category, {
      where: { slug: 'restaurantes' },
    });
    const eletronicosCategory = await dataSource.manager.findOne(Category, {
      where: { slug: 'eletronicos' },
    });

    const materiaisSubcategory = await dataSource.manager.findOne(Subcategory, {
      where: { slug: 'materiais-construcao' },
    });
    const pizzariaSubcategory = await dataSource.manager.findOne(Subcategory, {
      where: { slug: 'pizzaria' },
    });
    const smartphonesSubcategory = await dataSource.manager.findOne(Subcategory, {
      where: { slug: 'smartphones' },
    });

    // Criar empresas de exemplo com categorização
    const companies = [
      {
        name: 'Construtora Silva',
        slug: 'construtora-silva',
        description: 'Materiais de construção e ferramentas',
        placeId: place.id,
        address: 'Rua da Construção, 123',
        phone: '(32) 3333-1111',
        email: 'contato@construtorasilva.com',
        categoryId: casaCategory?.id,
        subcategoryId: materiaisSubcategory?.id,
        tags: 'construção, materiais, ferramentas, cimento, tijolo',
      },
      {
        name: 'Pizzaria Bella Vista',
        slug: 'pizzaria-bella-vista',
        description: 'As melhores pizzas da cidade',
        placeId: place.id,
        address: 'Avenida Central, 456',
        phone: '(32) 3333-2222',
        email: 'pedidos@pizzariabellavista.com',
        categoryId: restaurantesCategory?.id,
        subcategoryId: pizzariaSubcategory?.id,
        tags: 'pizza, italiana, delivery, massa, queijo',
        website: 'https://pizzariabellavista.com',
        openingHours: 'Seg-Dom: 18:00-23:00',
      },
      {
        name: 'TechCell Store',
        slug: 'techcell-store',
        description: 'Smartphones, acessórios e assistência técnica',
        placeId: place.id,
        address: 'Shopping Center, Loja 42',
        phone: '(32) 3333-3333',
        email: 'vendas@techcellstore.com',
        categoryId: eletronicosCategory?.id,
        subcategoryId: smartphonesSubcategory?.id,
        tags: 'celular, smartphone, iPhone, Samsung, assistência',
        website: 'https://techcellstore.com',
      },
      {
        name: 'Padaria do João',
        slug: 'padaria-do-joao',
        description: 'Pães frescos e doces caseiros todos os dias',
        placeId: place.id,
        address: 'Rua das Flores, 789',
        phone: '(32) 3333-4444',
        email: 'padaria@joao.com',
        tags: 'pão, padaria, doces, café, croissant',
        openingHours: 'Seg-Sáb: 05:00-19:00, Dom: 06:00-12:00',
      },
      {
        name: 'Academia FitLife',
        slug: 'academia-fitlife',
        description: 'Academia completa com musculação e aulas coletivas',
        placeId: place.id,
        address: 'Avenida do Esporte, 321',
        phone: '(32) 3333-5555',
        email: 'info@academiafit.com',
        tags: 'academia, musculação, fitness, crossfit, personal',
        website: 'https://academiafit.com',
        openingHours: 'Seg-Sex: 05:00-23:00, Sáb: 07:00-18:00',
      },
    ];

    for (const companyData of companies) {
      const company = dataSource.manager.create(Company, companyData);
      await dataSource.manager.save(company);
      console.log(`Empresa "${companyData.name}" criada`);
    }

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

    // Buscar uma empresa para criar um admin
    const company = await dataSource.manager.findOne(Company, {
      where: { slug: 'construtora-silva' },
    });

    if (company) {
      // Criar usuário admin de empresa
      const companyAdmin = dataSource.manager.create(User, {
        name: 'Admin da Construtora',
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
    }

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
    console.log('\n=== Dados criados ===');
    console.log('🏢 Organização: Angu Market');
    console.log('📍 Place: Juiz de Fora');
    console.log('🏪 Empresas: 5 empresas com diferentes categorias');
    console.log('👥 Usuários:');
    console.log('   - Super Admin: admin@example.com');
    console.log('   - Place Admin: place@example.com');
    console.log('   - Company Admin: company@example.com');
    console.log('   - Public User: user@example.com');
    console.log('🔑 Senha para todos: admin123');
    console.log('\n📊 Segmentos e Categorias:');
    console.log('   - Comércio Local → Casa e Construção → Materiais');
    console.log('   - Alimentação → Restaurantes → Pizzaria');
    console.log('   - Comércio Local → Eletrônicos → Smartphones');
    console.log('   - E muitos outros...');
  } catch (error) {
    console.error('Erro ao executar seed:', error);
  } finally {
    await dataSource.destroy();
  }
}

main();

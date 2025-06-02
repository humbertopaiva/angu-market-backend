/* eslint-disable @typescript-eslint/no-unused-vars */
// src/migrations/1717175000000-AddSegmentsAndCategories.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSegmentsAndCategories1717175000000 implements MigrationInterface {
  name = 'AddSegmentsAndCategories1717175000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se as tabelas já existem antes de criar
    const segmentTable = await queryRunner.hasTable('segment');
    const categoryTable = await queryRunner.hasTable('category');
    const subcategoryTable = await queryRunner.hasTable('subcategory');
    const segmentCategoriesTable = await queryRunner.hasTable('segment_categories');

    // Criar tabela de segmentos apenas se não existir
    if (!segmentTable) {
      await queryRunner.query(`
        CREATE TABLE "segment" (
          "id" SERIAL NOT NULL,
          "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          "isActive" boolean NOT NULL DEFAULT true,
          "name" character varying NOT NULL,
          "slug" character varying NOT NULL,
          "description" character varying NOT NULL,
          "icon" character varying,
          "color" character varying,
          "order" integer NOT NULL DEFAULT 0,
          "placeId" integer NOT NULL,
          CONSTRAINT "UQ_segment_uuid" UNIQUE ("uuid"),
          CONSTRAINT "UQ_segment_slug" UNIQUE ("slug"),
          CONSTRAINT "PK_segment" PRIMARY KEY ("id")
        )
      `);
    }

    // Criar tabela de categorias apenas se não existir
    if (!categoryTable) {
      await queryRunner.query(`
        CREATE TABLE "category" (
          "id" SERIAL NOT NULL,
          "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          "isActive" boolean NOT NULL DEFAULT true,
          "name" character varying NOT NULL,
          "slug" character varying NOT NULL,
          "description" character varying NOT NULL,
          "icon" character varying,
          "color" character varying,
          "order" integer NOT NULL DEFAULT 0,
          "keywords" character varying,
          "placeId" integer NOT NULL,
          CONSTRAINT "UQ_category_uuid" UNIQUE ("uuid"),
          CONSTRAINT "UQ_category_slug" UNIQUE ("slug"),
          CONSTRAINT "PK_category" PRIMARY KEY ("id")
        )
      `);
    }

    // Criar tabela de subcategorias apenas se não existir
    if (!subcategoryTable) {
      await queryRunner.query(`
        CREATE TABLE "subcategory" (
          "id" SERIAL NOT NULL,
          "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          "isActive" boolean NOT NULL DEFAULT true,
          "name" character varying NOT NULL,
          "slug" character varying NOT NULL,
          "description" character varying NOT NULL,
          "icon" character varying,
          "order" integer NOT NULL DEFAULT 0,
          "keywords" character varying,
          "placeId" integer NOT NULL,
          "categoryId" integer NOT NULL,
          CONSTRAINT "UQ_subcategory_uuid" UNIQUE ("uuid"),
          CONSTRAINT "UQ_subcategory_slug" UNIQUE ("slug"),
          CONSTRAINT "PK_subcategory" PRIMARY KEY ("id")
        )
      `);
    }

    // Criar tabela de relacionamento many-to-many apenas se não existir
    if (!segmentCategoriesTable) {
      await queryRunner.query(`
        CREATE TABLE "segment_categories" (
          "segmentId" integer NOT NULL,
          "categoryId" integer NOT NULL,
          CONSTRAINT "PK_segment_categories" PRIMARY KEY ("segmentId", "categoryId")
        )
      `);
    }

    // Verificar se as colunas já existem na tabela company
    const companyTable = await queryRunner.getTable('company');
    if (companyTable) {
      const hasCategoryId = companyTable.findColumnByName('categoryId');
      const hasSubcategoryId = companyTable.findColumnByName('subcategoryId');
      const hasTags = companyTable.findColumnByName('tags');

      // Adicionar colunas apenas se não existirem
      if (!hasCategoryId) {
        await queryRunner.query(`ALTER TABLE "company" ADD COLUMN "categoryId" integer`);
      }
      if (!hasSubcategoryId) {
        await queryRunner.query(`ALTER TABLE "company" ADD COLUMN "subcategoryId" integer`);
      }
      if (!hasTags) {
        await queryRunner.query(`ALTER TABLE "company" ADD COLUMN "tags" text`);
      }
    }

    // Adicionar chaves estrangeiras apenas se as tabelas existem
    const placeTable = await queryRunner.hasTable('place');

    if (segmentTable !== true && placeTable) {
      await queryRunner.query(`
        ALTER TABLE "segment" ADD CONSTRAINT "FK_segment_place" 
        FOREIGN KEY ("placeId") REFERENCES "place"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    if (categoryTable !== true && placeTable) {
      await queryRunner.query(`
        ALTER TABLE "category" ADD CONSTRAINT "FK_category_place" 
        FOREIGN KEY ("placeId") REFERENCES "place"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    if (subcategoryTable !== true) {
      await queryRunner.query(`
        ALTER TABLE "subcategory" ADD CONSTRAINT "FK_subcategory_category" 
        FOREIGN KEY ("categoryId") REFERENCES "category"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);

      if (placeTable) {
        await queryRunner.query(`
          ALTER TABLE "subcategory" ADD CONSTRAINT "FK_subcategory_place" 
          FOREIGN KEY ("placeId") REFERENCES "place"("id") 
          ON DELETE CASCADE ON UPDATE NO ACTION
        `);
      }
    }

    if (segmentCategoriesTable !== true) {
      await queryRunner.query(`
        ALTER TABLE "segment_categories" ADD CONSTRAINT "FK_segment_categories_segment" 
        FOREIGN KEY ("segmentId") REFERENCES "segment"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);

      await queryRunner.query(`
        ALTER TABLE "segment_categories" ADD CONSTRAINT "FK_segment_categories_category" 
        FOREIGN KEY ("categoryId") REFERENCES "category"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
    }

    // Adicionar chaves estrangeiras para company se ainda não existem
    if (companyTable) {
      const foreignKeys = companyTable.foreignKeys;
      const hasCategoryFK = foreignKeys.some(fk => fk.columnNames.includes('categoryId'));
      const hasSubcategoryFK = foreignKeys.some(fk => fk.columnNames.includes('subcategoryId'));

      if (!hasCategoryFK) {
        await queryRunner.query(`
          ALTER TABLE "company" ADD CONSTRAINT "FK_company_category" 
          FOREIGN KEY ("categoryId") REFERENCES "category"("id") 
          ON DELETE SET NULL ON UPDATE NO ACTION
        `);
      }

      if (!hasSubcategoryFK) {
        await queryRunner.query(`
          ALTER TABLE "company" ADD CONSTRAINT "FK_company_subcategory" 
          FOREIGN KEY ("subcategoryId") REFERENCES "subcategory"("id") 
          ON DELETE SET NULL ON UPDATE NO ACTION
        `);
      }
    }

    // Criar índices apenas se as tabelas foram criadas agora
    if (!segmentTable) {
      await queryRunner.query(`CREATE INDEX "IDX_segment_slug" ON "segment" ("slug")`);
      await queryRunner.query(`CREATE INDEX "IDX_segment_order" ON "segment" ("order")`);
      await queryRunner.query(`CREATE INDEX "IDX_segment_placeId" ON "segment" ("placeId")`);
    }

    if (!categoryTable) {
      await queryRunner.query(`CREATE INDEX "IDX_category_slug" ON "category" ("slug")`);
      await queryRunner.query(`CREATE INDEX "IDX_category_order" ON "category" ("order")`);
      await queryRunner.query(`CREATE INDEX "IDX_category_placeId" ON "category" ("placeId")`);
    }

    if (!subcategoryTable) {
      await queryRunner.query(`CREATE INDEX "IDX_subcategory_slug" ON "subcategory" ("slug")`);
      await queryRunner.query(`CREATE INDEX "IDX_subcategory_order" ON "subcategory" ("order")`);
      await queryRunner.query(
        `CREATE INDEX "IDX_subcategory_categoryId" ON "subcategory" ("categoryId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_subcategory_placeId" ON "subcategory" ("placeId")`,
      );
    }

    if (companyTable) {
      // Verificar se os índices já existem antes de criar
      try {
        await queryRunner.query(
          `CREATE INDEX "IDX_company_categoryId" ON "company" ("categoryId")`,
        );
      } catch (e) {
        // Índice já existe, ignorar
      }

      try {
        await queryRunner.query(
          `CREATE INDEX "IDX_company_subcategoryId" ON "company" ("subcategoryId")`,
        );
      } catch (e) {
        // Índice já existe, ignorar
      }
    }

    // Verificar se place com id 1 existe antes de inserir dados
    const placeExists = await queryRunner.query(`SELECT id FROM "place" WHERE id = 1 LIMIT 1`);

    if (placeExists && placeExists.length > 0) {
      const placeId = placeExists[0].id;

      // Inserir dados iniciais apenas se as tabelas estão vazias
      const segmentCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "segment"`);
      if (parseInt(segmentCount[0].count) === 0) {
        await queryRunner.query(`
          INSERT INTO "segment" ("name", "slug", "description", "icon", "color", "order", "placeId") VALUES
          ('Comércio Local', 'comercio-local', 'Estabelecimentos comerciais da região', '🏪', '#2563eb', 1, ${placeId}),
          ('Serviços', 'servicos', 'Prestadores de serviços diversos', '🔧', '#059669', 2, ${placeId}),
          ('Alimentação', 'alimentacao', 'Restaurantes, lanchonetes e delivery', '🍕', '#dc2626', 3, ${placeId}),
          ('Saúde e Bem-estar', 'saude-bem-estar', 'Clínicas, academias e cuidados pessoais', '⚕️', '#7c3aed', 4, ${placeId}),
          ('Educação', 'educacao', 'Escolas, cursos e capacitação', '📚', '#ea580c', 5, ${placeId})
        `);
      }

      const categoryCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "category"`);
      if (parseInt(categoryCount[0].count) === 0) {
        await queryRunner.query(`
          INSERT INTO "category" ("name", "slug", "description", "icon", "color", "order", "keywords", "placeId") VALUES
          ('Casa e Construção', 'casa-construcao', 'Materiais e serviços para construção e reforma', '🏗️', '#374151', 1, 'construção,reforma,materiais,casa', ${placeId}),
          ('Moda e Beleza', 'moda-beleza', 'Roupas, acessórios e produtos de beleza', '👗', '#ec4899', 2, 'roupas,moda,beleza,acessórios', ${placeId}),
          ('Eletrônicos', 'eletronicos', 'Equipamentos eletrônicos e tecnologia', '📱', '#3b82f6', 3, 'eletrônicos,tecnologia,celular,computador', ${placeId}),
          ('Supermercados', 'supermercados', 'Mercados e estabelecimentos de alimentação', '🛒', '#16a34a', 4, 'mercado,supermercado,alimentação,compras', ${placeId}),
          ('Restaurantes', 'restaurantes', 'Restaurantes e estabelecimentos gastronômicos', '🍽️', '#f59e0b', 5, 'restaurante,comida,gastronomia,refeição', ${placeId}),
          ('Clínicas e Consultórios', 'clinicas-consultorios', 'Serviços médicos e de saúde', '🏥', '#ef4444', 6, 'médico,clínica,saúde,consultório', ${placeId}),
          ('Escolas e Cursos', 'escolas-cursos', 'Instituições de ensino e capacitação', '🎓', '#8b5cf6', 7, 'escola,curso,educação,ensino', ${placeId})
        `);
      }

      const subcategoryCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "subcategory"`,
      );
      if (parseInt(subcategoryCount[0].count) === 0) {
        await queryRunner.query(`
          INSERT INTO "subcategory" ("name", "slug", "description", "categoryId", "order", "keywords", "placeId") VALUES
          ('Materiais de Construção', 'materiais-construcao', 'Cimento, tijolos, ferragens', 1, 1, 'cimento,tijolo,ferragem,material', ${placeId}),
          ('Reformas', 'reformas', 'Serviços de reforma e renovação', 1, 2, 'reforma,renovação,pintura,acabamento', ${placeId}),
          ('Acabamentos', 'acabamentos', 'Pisos, azulejos, tintas', 1, 3, 'piso,azulejo,tinta,acabamento', ${placeId}),
          ('Roupas Femininas', 'roupas-femininas', 'Vestuário feminino', 2, 1, 'roupa,feminina,vestido,blusa', ${placeId}),
          ('Roupas Masculinas', 'roupas-masculinas', 'Vestuário masculino', 2, 2, 'roupa,masculina,camisa,calça', ${placeId}),
          ('Cosméticos', 'cosmeticos', 'Produtos de beleza e cuidados pessoais', 2, 3, 'cosmético,maquiagem,perfume,cuidado', ${placeId}),
          ('Smartphones', 'smartphones', 'Celulares e acessórios', 3, 1, 'celular,smartphone,telefone,mobile', ${placeId}),
          ('Computadores', 'computadores', 'Notebooks, desktops e periféricos', 3, 2, 'computador,notebook,desktop,pc', ${placeId}),
          ('Hortifruti', 'hortifruti', 'Frutas, verduras e legumes', 4, 1, 'fruta,verdura,legume,hortifruti', ${placeId}),
          ('Açougue', 'acougue', 'Carnes e derivados', 4, 2, 'carne,açougue,frango,peixe', ${placeId}),
          ('Padaria', 'padaria', 'Pães, doces e confeitaria', 4, 3, 'pão,padaria,doce,confeitaria', ${placeId}),
          ('Pizzaria', 'pizzaria', 'Pizzas e massas', 5, 1, 'pizza,massa,italiana', ${placeId}),
          ('Lanchonete', 'lanchonete', 'Lanches e fast food', 5, 2, 'lanche,hambúrguer,fast food', ${placeId}),
          ('Médico Geral', 'medico-geral', 'Clínica geral e consultas', 6, 1, 'médico,clínico,geral,consulta', ${placeId}),
          ('Dentista', 'dentista', 'Serviços odontológicos', 6, 2, 'dentista,odontologia,dente', ${placeId}),
          ('Ensino Fundamental', 'ensino-fundamental', 'Educação básica fundamental', 7, 1, 'fundamental,escola,criança', ${placeId}),
          ('Cursos Técnicos', 'cursos-tecnicos', 'Capacitação técnica e profissional', 7, 2, 'técnico,profissional,capacitação', ${placeId})
        `);
      }

      // Associar categorias aos segmentos (many-to-many)
      const segmentCategoryCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "segment_categories"`,
      );
      if (parseInt(segmentCategoryCount[0].count) === 0) {
        await queryRunner.query(`
          INSERT INTO "segment_categories" ("segmentId", "categoryId") VALUES
          (1, 1), -- Comércio Local -> Casa e Construção
          (1, 2), -- Comércio Local -> Moda e Beleza
          (1, 3), -- Comércio Local -> Eletrônicos
          (1, 4), -- Comércio Local -> Supermercados
          (2, 1), -- Serviços -> Casa e Construção
          (3, 4), -- Alimentação -> Supermercados
          (3, 5), -- Alimentação -> Restaurantes
          (4, 6), -- Saúde e Bem-estar -> Clínicas e Consultórios
          (5, 7)  -- Educação -> Escolas e Cursos
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras das empresas
    const companyTable = await queryRunner.getTable('company');
    if (companyTable) {
      const foreignKeys = companyTable.foreignKeys;

      const subcategoryFK = foreignKeys.find(fk => fk.columnNames.includes('subcategoryId'));
      if (subcategoryFK) {
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "${subcategoryFK.name}"`);
      }

      const categoryFK = foreignKeys.find(fk => fk.columnNames.includes('categoryId'));
      if (categoryFK) {
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "${categoryFK.name}"`);
      }

      // Remover colunas da tabela company
      if (companyTable.findColumnByName('tags')) {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "tags"`);
      }
      if (companyTable.findColumnByName('subcategoryId')) {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "subcategoryId"`);
      }
      if (companyTable.findColumnByName('categoryId')) {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "categoryId"`);
      }
    }

    // Remover índices
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_subcategoryId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_categoryId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subcategory_placeId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subcategory_categoryId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subcategory_order"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subcategory_slug"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_category_placeId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_category_order"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_category_slug"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_segment_placeId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_segment_order"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_segment_slug"`);
    } catch {
      // Ignorar erros se os índices não existem
    }

    // Remover tabelas
    await queryRunner.query(`DROP TABLE IF EXISTS "segment_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subcategory"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "segment"`);
  }
}

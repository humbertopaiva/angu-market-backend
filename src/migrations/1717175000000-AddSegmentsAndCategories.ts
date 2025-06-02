// src/migrations/1717175000000-AddSegmentsAndCategories.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSegmentsAndCategories1717175000000 implements MigrationInterface {
  name = 'AddSegmentsAndCategories1717175000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de segmentos
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
        CONSTRAINT "UQ_segment_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_segment_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_segment" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de categorias
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
        CONSTRAINT "UQ_category_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_category_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_category" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de subcategorias
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
        "categoryId" integer NOT NULL,
        CONSTRAINT "UQ_subcategory_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_subcategory_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_subcategory" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de relacionamento many-to-many entre segmentos e categorias
    await queryRunner.query(`
      CREATE TABLE "segment_categories" (
        "segmentId" integer NOT NULL,
        "categoryId" integer NOT NULL,
        CONSTRAINT "PK_segment_categories" PRIMARY KEY ("segmentId", "categoryId")
      )
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "subcategory" ADD CONSTRAINT "FK_subcategory_category" 
      FOREIGN KEY ("categoryId") REFERENCES "category"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

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

    // Adicionar colunas de categoria e subcategoria na tabela company
    await queryRunner.query(`
      ALTER TABLE "company" ADD COLUMN "categoryId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "company" ADD COLUMN "subcategoryId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "company" ADD COLUMN "tags" text
    `);

    // Adicionar chaves estrangeiras para company
    await queryRunner.query(`
      ALTER TABLE "company" ADD CONSTRAINT "FK_company_category" 
      FOREIGN KEY ("categoryId") REFERENCES "category"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "company" ADD CONSTRAINT "FK_company_subcategory" 
      FOREIGN KEY ("subcategoryId") REFERENCES "subcategory"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Criar índices para melhor performance
    await queryRunner.query(`CREATE INDEX "IDX_segment_slug" ON "segment" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_segment_order" ON "segment" ("order")`);
    await queryRunner.query(`CREATE INDEX "IDX_category_slug" ON "category" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_category_order" ON "category" ("order")`);
    await queryRunner.query(`CREATE INDEX "IDX_subcategory_slug" ON "subcategory" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_subcategory_order" ON "subcategory" ("order")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_subcategory_categoryId" ON "subcategory" ("categoryId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_company_categoryId" ON "company" ("categoryId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_company_subcategoryId" ON "company" ("subcategoryId")`,
    );

    // Inserir dados iniciais de exemplo
    await queryRunner.query(`
      INSERT INTO "segment" ("name", "slug", "description", "icon", "color", "order") VALUES
      ('Comércio Local', 'comercio-local', 'Estabelecimentos comerciais da região', '🏪', '#2563eb', 1),
      ('Serviços', 'servicos', 'Prestadores de serviços diversos', '🔧', '#059669', 2),
      ('Alimentação', 'alimentacao', 'Restaurantes, lanchonetes e delivery', '🍕', '#dc2626', 3),
      ('Saúde e Bem-estar', 'saude-bem-estar', 'Clínicas, academias e cuidados pessoais', '⚕️', '#7c3aed', 4),
      ('Educação', 'educacao', 'Escolas, cursos e capacitação', '📚', '#ea580c', 5)
    `);

    await queryRunner.query(`
      INSERT INTO "category" ("name", "slug", "description", "icon", "color", "order", "keywords") VALUES
      ('Casa e Construção', 'casa-construcao', 'Materiais e serviços para construção e reforma', '🏗️', '#374151', 1, 'construção,reforma,materiais,casa'),
      ('Moda e Beleza', 'moda-beleza', 'Roupas, acessórios e produtos de beleza', '👗', '#ec4899', 2, 'roupas,moda,beleza,acessórios'),
      ('Eletrônicos', 'eletronicos', 'Equipamentos eletrônicos e tecnologia', '📱', '#3b82f6', 3, 'eletrônicos,tecnologia,celular,computador'),
      ('Supermercados', 'supermercados', 'Mercados e estabelecimentos de alimentação', '🛒', '#16a34a', 4, 'mercado,supermercado,alimentação,compras'),
      ('Restaurantes', 'restaurantes', 'Restaurantes e estabelecimentos gastronômicos', '🍽️', '#f59e0b', 5, 'restaurante,comida,gastronomia,refeição'),
      ('Clínicas e Consultórios', 'clinicas-consultorios', 'Serviços médicos e de saúde', '🏥', '#ef4444', 6, 'médico,clínica,saúde,consultório'),
      ('Escolas e Cursos', 'escolas-cursos', 'Instituições de ensino e capacitação', '🎓', '#8b5cf6', 7, 'escola,curso,educação,ensino')
    `);

    await queryRunner.query(`
      INSERT INTO "subcategory" ("name", "slug", "description", "categoryId", "order", "keywords") VALUES
      ('Materiais de Construção', 'materiais-construcao', 'Cimento, tijolos, ferragens', 1, 1, 'cimento,tijolo,ferragem,material'),
      ('Reformas', 'reformas', 'Serviços de reforma e renovação', 1, 2, 'reforma,renovação,pintura,acabamento'),
      ('Acabamentos', 'acabamentos', 'Pisos, azulejos, tintas', 1, 3, 'piso,azulejo,tinta,acabamento'),
      ('Roupas Femininas', 'roupas-femininas', 'Vestuário feminino', 2, 1, 'roupa,feminina,vestido,blusa'),
      ('Roupas Masculinas', 'roupas-masculinas', 'Vestuário masculino', 2, 2, 'roupa,masculina,camisa,calça'),
      ('Cosméticos', 'cosmeticos', 'Produtos de beleza e cuidados pessoais', 2, 3, 'cosmético,maquiagem,perfume,cuidado'),
      ('Smartphones', 'smartphones', 'Celulares e acessórios', 3, 1, 'celular,smartphone,telefone,mobile'),
      ('Computadores', 'computadores', 'Notebooks, desktops e periféricos', 3, 2, 'computador,notebook,desktop,pc'),
      ('Hortifruti', 'hortifruti', 'Frutas, verduras e legumes', 4, 1, 'fruta,verdura,legume,hortifruti'),
      ('Açougue', 'acougue', 'Carnes e derivados', 4, 2, 'carne,açougue,frango,peixe'),
      ('Padaria', 'padaria', 'Pães, doces e confeitaria', 4, 3, 'pão,padaria,doce,confeitaria'),
      ('Pizzaria', 'pizzaria', 'Pizzas e massas', 5, 1, 'pizza,massa,italiana'),
      ('Lanchonete', 'lanchonete', 'Lanches e fast food', 5, 2, 'lanche,hambúrguer,fast food'),
      ('Médico Geral', 'medico-geral', 'Clínica geral e consultas', 6, 1, 'médico,clínico,geral,consulta'),
      ('Dentista', 'dentista', 'Serviços odontológicos', 6, 2, 'dentista,odontologia,dente'),
      ('Ensino Fundamental', 'ensino-fundamental', 'Educação básica fundamental', 7, 1, 'fundamental,escola,criança'),
      ('Cursos Técnicos', 'cursos-tecnicos', 'Capacitação técnica e profissional', 7, 2, 'técnico,profissional,capacitação')
    `);

    // Associar categorias aos segmentos (many-to-many)
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras das empresas
    await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_company_subcategory"`);
    await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_company_category"`);

    // Remover colunas da tabela company
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "tags"`);
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "subcategoryId"`);
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "categoryId"`);

    // Remover chaves estrangeiras
    await queryRunner.query(
      `ALTER TABLE "segment_categories" DROP CONSTRAINT "FK_segment_categories_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "segment_categories" DROP CONSTRAINT "FK_segment_categories_segment"`,
    );
    await queryRunner.query(`ALTER TABLE "subcategory" DROP CONSTRAINT "FK_subcategory_category"`);

    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_company_subcategoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_company_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_subcategory_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_subcategory_order"`);
    await queryRunner.query(`DROP INDEX "IDX_subcategory_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_category_order"`);
    await queryRunner.query(`DROP INDEX "IDX_category_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_segment_order"`);
    await queryRunner.query(`DROP INDEX "IDX_segment_slug"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "segment_categories"`);
    await queryRunner.query(`DROP TABLE "subcategory"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TABLE "segment"`);
  }
}

// src/migrations/1717177000000-AddSegmentationToCompanies.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSegmentationToCompanies1717177000000 implements MigrationInterface {
  name = 'AddSegmentationToCompanies1717177000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se as tabelas de segmentação existem
    const segmentTableExists = await queryRunner.hasTable('segment');
    const categoryTableExists = await queryRunner.hasTable('category');
    const subcategoryTableExists = await queryRunner.hasTable('subcategory');

    if (!segmentTableExists || !categoryTableExists || !subcategoryTableExists) {
      throw new Error(
        'As tabelas de segmentação (segment, category, subcategory) devem existir antes de executar esta migration',
      );
    }

    // Verificar se as colunas já existem na tabela company
    const companyTable = await queryRunner.getTable('company');
    if (!companyTable) {
      throw new Error('Tabela company não encontrada');
    }

    const hasSegmentId = companyTable.findColumnByName('segmentId');
    const hasCategoryId = companyTable.findColumnByName('categoryId');
    const hasSubcategoryId = companyTable.findColumnByName('subcategoryId');

    // Adicionar colunas de segmentação se não existirem
    if (!hasSegmentId) {
      await queryRunner.query(`
        ALTER TABLE "company" ADD COLUMN "segmentId" integer
      `);
    }

    if (!hasCategoryId) {
      await queryRunner.query(`
        ALTER TABLE "company" ADD COLUMN "categoryId" integer
      `);
    }

    if (!hasSubcategoryId) {
      await queryRunner.query(`
        ALTER TABLE "company" ADD COLUMN "subcategoryId" integer
      `);
    }

    // Adicionar chaves estrangeiras
    if (!hasSegmentId) {
      await queryRunner.query(`
        ALTER TABLE "company" ADD CONSTRAINT "FK_company_segment" 
        FOREIGN KEY ("segmentId") REFERENCES "segment"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }

    if (!hasCategoryId) {
      await queryRunner.query(`
        ALTER TABLE "company" ADD CONSTRAINT "FK_company_category" 
        FOREIGN KEY ("categoryId") REFERENCES "category"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }

    if (!hasSubcategoryId) {
      await queryRunner.query(`
        ALTER TABLE "company" ADD CONSTRAINT "FK_company_subcategory" 
        FOREIGN KEY ("subcategoryId") REFERENCES "subcategory"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_segmentId" ON "company" ("segmentId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_categoryId" ON "company" ("categoryId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_subcategoryId" ON "company" ("subcategoryId")
    `);

    // IMPORTANTE: Por enquanto, os campos são opcionais para não quebrar empresas existentes
    // Mais tarde, quando todas as empresas tiverem segmentação, podemos torná-los obrigatórios
    console.log('✅ Campos de segmentação adicionados à tabela company');
    console.log('⚠️  ATENÇÃO: Os campos são opcionais por enquanto');
    console.log(
      '📝 TODO: Após definir segmentação para todas as empresas, execute migration para torná-los NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_subcategoryId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_categoryId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_segmentId"`);

    // Remover chaves estrangeiras
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

      const segmentFK = foreignKeys.find(fk => fk.columnNames.includes('segmentId'));
      if (segmentFK) {
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "${segmentFK.name}"`);
      }
    }

    // Remover colunas
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN IF EXISTS "subcategoryId"`);
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN IF EXISTS "categoryId"`);
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN IF EXISTS "segmentId"`);
  }
}

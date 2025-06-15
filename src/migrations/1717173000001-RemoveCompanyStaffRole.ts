// src/migrations/1717173000001-RemoveCompanyStaffRole.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCompanyStaffRole1717173000001 implements MigrationInterface {
  name = 'RemoveCompanyStaffRole1717173000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Primeiro, vamos converter todos os COMPANY_STAFF para COMPANY_ADMIN
    // Isso garante que nenhum usuário perca acesso
    await queryRunner.query(`
      UPDATE "user_role" 
      SET "roleId" = (
        SELECT "id" FROM "role" WHERE "name" = 'COMPANY_ADMIN'
      )
      WHERE "roleId" = (
        SELECT "id" FROM "role" WHERE "name" = 'COMPANY_STAFF'
      )
    `);

    // 2. Remover a role COMPANY_STAFF
    await queryRunner.query(`
      DELETE FROM "role" WHERE "name" = 'COMPANY_STAFF'
    `);

    // 3. Atualizar o enum no banco (se estiver usando enum no PostgreSQL)
    // Nota: Esta parte pode variar dependendo do banco de dados
    await queryRunner.query(`
      ALTER TYPE "public"."role_name_enum" 
      DROP VALUE IF EXISTS 'COMPANY_STAFF'
    `);

    console.log('✅ COMPANY_STAFF role removed successfully');
    console.log('✅ All former COMPANY_STAFF users converted to COMPANY_ADMIN');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter as alterações
    
    // 1. Recriar o enum com COMPANY_STAFF
    await queryRunner.query(`
      ALTER TYPE "public"."role_name_enum" 
      ADD VALUE IF NOT EXISTS 'COMPANY_STAFF'
    `);

    // 2. Recriar a role COMPANY_STAFF
    await queryRunner.query(`
      INSERT INTO "role" ("name", "description") VALUES
      ('COMPANY_STAFF', 'Funcionário de empresa')
    `);

    console.log('⚠️  COMPANY_STAFF role restored (rollback)');
    console.log('⚠️  Note: Users remain as COMPANY_ADMIN - manual conversion needed if desired');
  }
}
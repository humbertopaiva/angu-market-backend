// src/migrations/1717173000002-CleanupCompanyStaffData.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupCompanyStaffData1717173000002 implements MigrationInterface {
  name = 'CleanupCompanyStaffData1717173000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🧹 Iniciando limpeza de dados COMPANY_STAFF...');

    // 1. Verificar se existem registros COMPANY_STAFF na tabela role
    const companyStaffRoles = await queryRunner.query(`
      SELECT id, name FROM "role" WHERE "name" = 'COMPANY_STAFF'
    `);

    if (companyStaffRoles.length > 0) {
      console.log(`⚠️  Encontrados ${companyStaffRoles.length} registros COMPANY_STAFF na tabela role`);

      // 2. Verificar se existem user_roles vinculados
      const userRolesWithCompanyStaff = await queryRunner.query(`
        SELECT ur.id, ur."userId", ur."roleId" 
        FROM "user_role" ur
        INNER JOIN "role" r ON ur."roleId" = r.id
        WHERE r."name" = 'COMPANY_STAFF'
      `);

      if (userRolesWithCompanyStaff.length > 0) {
        console.log(`⚠️  Encontrados ${userRolesWithCompanyStaff.length} usuários com role COMPANY_STAFF`);

        // 3. Obter o ID da role COMPANY_ADMIN
        const companyAdminRole = await queryRunner.query(`
          SELECT id FROM "role" WHERE "name" = 'COMPANY_ADMIN'
        `);

        if (companyAdminRole.length === 0) {
          throw new Error('Role COMPANY_ADMIN não encontrada! Execute a migration InitialSchema primeiro.');
        }

        const companyAdminId = companyAdminRole[0].id;

        // 4. Converter todos os COMPANY_STAFF para COMPANY_ADMIN
        await queryRunner.query(`
          UPDATE "user_role" 
          SET "roleId" = $1
          WHERE "roleId" IN (
            SELECT id FROM "role" WHERE "name" = 'COMPANY_STAFF'
          )
        `, [companyAdminId]);

        console.log(`✅ ${userRolesWithCompanyStaff.length} usuários convertidos de COMPANY_STAFF para COMPANY_ADMIN`);
      }

      // 5. Remover a role COMPANY_STAFF da tabela
      await queryRunner.query(`
        DELETE FROM "role" WHERE "name" = 'COMPANY_STAFF'
      `);

      console.log('✅ Role COMPANY_STAFF removida da tabela');
    } else {
      console.log('ℹ️  Nenhum registro COMPANY_STAFF encontrado na tabela role');
    }

    // 6. Verificar se o enum ainda contém COMPANY_STAFF
    const enumValues = await queryRunner.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'role_name_enum'
      )
    `);

    const hasCompanyStaff = enumValues.some(row => row.enumlabel === 'COMPANY_STAFF');

    if (hasCompanyStaff) {
      console.log('⚠️  Enum role_name_enum ainda contém COMPANY_STAFF, removendo...');

      // 7. Remover COMPANY_STAFF do enum usando a estratégia de recriação
      // Criar novo enum sem COMPANY_STAFF
      await queryRunner.query(`
        CREATE TYPE "role_name_enum_new" AS ENUM (
          'SUPER_ADMIN',
          'ORGANIZATION_ADMIN', 
          'PLACE_ADMIN',
          'COMPANY_ADMIN',
          'PUBLIC_USER'
        )
      `);

      // Remover default da coluna
      await queryRunner.query(`
        ALTER TABLE "role" ALTER COLUMN "name" DROP DEFAULT
      `);

      // Alterar tipo da coluna
      await queryRunner.query(`
        ALTER TABLE "role" 
        ALTER COLUMN "name" TYPE "role_name_enum_new" 
        USING "name"::text::"role_name_enum_new"
      `);

      // Restaurar default
      await queryRunner.query(`
        ALTER TABLE "role" 
        ALTER COLUMN "name" SET DEFAULT 'PUBLIC_USER'::"role_name_enum_new"
      `);

      // Remover enum antigo
      await queryRunner.query(`DROP TYPE "public"."role_name_enum"`);

      // Renomear enum novo
      await queryRunner.query(`ALTER TYPE "role_name_enum_new" RENAME TO "role_name_enum"`);

      console.log('✅ Enum role_name_enum atualizado sem COMPANY_STAFF');
    } else {
      console.log('ℹ️  Enum role_name_enum já não contém COMPANY_STAFF');
    }

    console.log('✅ Limpeza de dados COMPANY_STAFF concluída com sucesso!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  Rollback: Restaurando COMPANY_STAFF...');

    // 1. Recriar enum com COMPANY_STAFF
    await queryRunner.query(`
      CREATE TYPE "role_name_enum_new" AS ENUM (
        'SUPER_ADMIN',
        'ORGANIZATION_ADMIN', 
        'PLACE_ADMIN',
        'COMPANY_ADMIN',
        'COMPANY_STAFF',
        'PUBLIC_USER'
      )
    `);

    // 2. Alterar coluna
    await queryRunner.query(`
      ALTER TABLE "role" ALTER COLUMN "name" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "role" 
      ALTER COLUMN "name" TYPE "role_name_enum_new" 
      USING "name"::text::"role_name_enum_new"
    `);

    await queryRunner.query(`
      ALTER TABLE "role" 
      ALTER COLUMN "name" SET DEFAULT 'PUBLIC_USER'::"role_name_enum_new"
    `);

    // 3. Trocar enums
    await queryRunner.query(`DROP TYPE "public"."role_name_enum"`);
    await queryRunner.query(`ALTER TYPE "role_name_enum_new" RENAME TO "role_name_enum"`);

    // 4. Recriar role COMPANY_STAFF
    await queryRunner.query(`
      INSERT INTO "role" ("name", "description") VALUES
      ('COMPANY_STAFF', 'Funcionário de empresa')
    `);

    console.log('✅ COMPANY_STAFF restaurado (rollback concluído)');
  }
}
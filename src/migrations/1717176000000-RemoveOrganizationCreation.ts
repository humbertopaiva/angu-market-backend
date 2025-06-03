// src/migrations/1717176000000-RemoveOrganizationCreation.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOrganizationCreation1717176000000 implements MigrationInterface {
  name = 'RemoveOrganizationCreation1717176000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se existe uma organização com slug 'main-organization'
    const existingOrg = await queryRunner.query(
      `SELECT id FROM "organization" WHERE slug = 'main-organization' LIMIT 1`,
    );

    if (existingOrg.length === 0) {
      // Inserir organização principal (uuid será gerado automaticamente pelo trigger)
      await queryRunner.query(`
        INSERT INTO "organization" ("uuid", "name", "slug", "description", "logo", "banner", "isActive")
        VALUES (uuid_generate_v4(), 'Main Organization', 'main-organization', 'Organização principal do sistema', null, null, true)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover organização principal se não há places dependentes
    await queryRunner.query(`
      DELETE FROM "organization" 
      WHERE slug = 'main-organization' 
      AND NOT EXISTS (SELECT 1 FROM "place" WHERE "organizationId" = "organization"."id")
    `);
  }
}

// src/scripts/diagnostic-companies.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CompaniesService } from '../modules/companies/companies.service';
import { Logger } from '@nestjs/common';

async function diagnoseCompaniesModule() {
  const logger = new Logger('CompanyDiagnostic');
  
  try {
    logger.log('🔍 Iniciando diagnóstico do módulo de empresas...');
    
    // Criar aplicação NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Obter o service de empresas
    const companiesService = app.get(CompaniesService);
    
    logger.log('✅ CompaniesService instanciado com sucesso');
    
 
    // Teste 2: Buscar todas as empresas
    logger.log('🏢 Testando busca de empresas...');
    try {
      const companies = await companiesService.findAll();
      logger.log(`✅ Busca bem-sucedida: ${companies.length} empresas encontradas`);
      
      // Log detalhado das primeiras empresas
      companies.slice(0, 3).forEach((company, index) => {
        logger.log(`Empresa ${index + 1}: ${company.name} (ID: ${company.id}, Place: ${company.place?.name || 'N/A'})`);
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar empresas:', error.message);
      logger.error('Stack trace:', error.stack);
    }
    
    // Teste 3: Verificar se há places disponíveis
    logger.log('🏪 Testando busca por place (se houver empresas)...');
    try {
      const companies = await companiesService.findAll();
      if (companies.length > 0) {
        const firstPlaceId = companies[0].placeId;
        const companiesByPlace = await companiesService.findByPlace(firstPlaceId);
        logger.log(`✅ Busca por place bem-sucedida: ${companiesByPlace.length} empresas no place ${firstPlaceId}`);
      } else {
        logger.log('⚠️ Nenhuma empresa encontrada para testar busca por place');
      }
    } catch (error) {
      logger.error('❌ Erro ao buscar empresas por place:', error.message);
    }
    
    // Teste 4: Verificar GraphQL Schema
    logger.log('📋 Verificando se o schema GraphQL foi gerado...');
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(process.cwd(), 'src/schema.gql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      if (schema.includes('type Company')) {
        logger.log('✅ Schema GraphQL contém tipo Company');
      } else {
        logger.error('❌ Tipo Company não encontrado no schema GraphQL');
      }
      
      if (schema.includes('companies')) {
        logger.log('✅ Query companies encontrada no schema');
      } else {
        logger.error('❌ Query companies não encontrada no schema');
      }
    } else {
      logger.error('❌ Arquivo schema.gql não encontrado');
    }
    
    logger.log('🎉 Diagnóstico concluído!');
    
    await app.close();
    
  } catch (error) {
    logger.error('💥 Erro crítico durante diagnóstico:', error.message);
    logger.error('Stack trace completo:', error.stack);
  }
}

// Executar diagnóstico
if (require.main === module) {
  diagnoseCompaniesModule()
    .then(() => {
      console.log('Diagnóstico finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro no diagnóstico:', error);
      process.exit(1);
    });
}

export { diagnoseCompaniesModule };
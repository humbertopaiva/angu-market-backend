import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from './entities/company.entity';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async create(createCompanyInput: CreateCompanyInput): Promise<Company> {
    const { slug } = createCompanyInput;

    // Verifica se já existe uma empresa com o mesmo slug
    const existingCompany = await this.companyRepository.findOne({
      where: { slug },
    });

    if (existingCompany) {
      throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
    }

    const company = this.companyRepository.create(createCompanyInput);
    return this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      relations: ['place'],
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['place', 'users'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    return company;
  }

  async findBySlug(slug: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { slug },
      relations: ['place', 'users'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa com slug ${slug} não encontrada`);
    }

    return company;
  }

  async findByPlace(placeId: number): Promise<Company[]> {
    return this.companyRepository.find({
      where: { placeId },
    });
  }

  async update(id: number, updateCompanyInput: UpdateCompanyInput): Promise<Company> {
    const { slug } = updateCompanyInput;

    // Verifica se a empresa existe
    const company = await this.findOne(id);

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

  async remove(id: number): Promise<Company> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
    return company;
  }
}

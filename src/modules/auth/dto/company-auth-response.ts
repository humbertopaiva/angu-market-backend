// src/modules/auth/dto/company-auth-response.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@ObjectType()
export class CompanyAuthResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;

  @Field(() => Company)
  company: Company;
}

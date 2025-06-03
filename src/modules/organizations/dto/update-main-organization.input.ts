import { InputType, OmitType } from '@nestjs/graphql';
import { UpdateOrganizationInput } from './update-organization.input';

@InputType()
export class UpdateMainOrganizationInput extends OmitType(UpdateOrganizationInput, [
  'id',
] as const) {}

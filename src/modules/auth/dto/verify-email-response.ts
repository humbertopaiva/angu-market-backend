import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerifyEmailResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

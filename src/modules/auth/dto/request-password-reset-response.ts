import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RequestPasswordResetResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

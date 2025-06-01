import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SignUpResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  userId?: number;
}

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PresignedUrlResponse {
  @Field()
  presignedUrl: string;

  @Field()
  key: string;

  @Field()
  fileUrl: string;
}

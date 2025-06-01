import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

interface GraphQLContext {
  req: Request;
}

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req }: { req: Request }): GraphQLContext => ({ req }),
      formatError: error => {
        const graphQLFormattedError = {
          message: error.message,
          path: error.path,
          extensions: {
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          },
        };
        return graphQLFormattedError;
      },
    }),
  ],

  exports: [NestGraphQLModule],
})
export class GraphQLModule {}

import { cacheExchange, Resolver, Cache } from "@urql/exchange-graphcache";
import {
  dedupExchange,
  Exchange,
  fetchExchange,
  stringifyVariables,
} from "urql";
import { pipe, tap } from "wonka";
import {
  LoginMutation,
  LogoutMutation,
  MeDocument,
  MeQuery,
  RegisterMutation,
  VoteMutationVariables,
  DeletePostMutationVariables,
} from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import Router from "next/router";
import gql from "graphql-tag";
import { isServer } from "./isServer";

// allows to catch all error at a global level
const errorExchange: Exchange =
  ({ forward }) =>
  (ops$) => {
    return pipe(
      forward(ops$),
      tap(({ error }) => {
        //if not auth, redirect to login from history
        if (error?.message.includes("not authenticated")) {
          Router.replace("/login");
        }
      })
    );
  };

const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;
    //get all the fields from the cache under the Query
    const allFields = cache.inspectFields(entityKey);
    //filter only the posts
    const fieldInfos = allFields.filter(
      (info: any) => info.fieldName === fieldName
    );
    const size = fieldInfos.length;
    //if there is no data -> cache miss -> return undefined
    if (size === 0) {
      return undefined;
    }

    //get field key
    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    //check if field key is in the cache
    const isItInTheCache = cache.resolve(
      cache.resolveFieldByKey(entityKey, fieldKey) as string,
      "posts"
    );
    //tell the URQL when to do the Query
    //get from the server when the key is not in the cache
    info.partial = !isItInTheCache;

    let hasMore = true;
    const results: string[] = [];
    //loop through the cache and return a list
    fieldInfos.forEach((fi: any) => {
      //key string
      const key = cache.resolveFieldByKey(entityKey, fi.fieldKey) as string;

      const data = cache.resolve(key, "posts") as string[];
      const _hasMore = cache.resolve(key, "hasMore");

      if (!_hasMore) {
        hasMore = _hasMore as boolean;
      }
      results.push(...data);
    });

    return {
      __typename: "PaginatedPosts",
      hasMore,
      posts: results,
    };
  };
};

//CLIENT SIDE function: invalidate the item from the cache and update/fetch the query
function invalidateAllPosts(cache: Cache) {
  const allFields = cache.inspectFields("Query");
  //filter by posts, get all the arguments and invalidate all of them
  const fieldInfos = allFields.filter((info) => info.fieldName === "posts");
  fieldInfos.forEach((fi) => {
    cache.invalidate("Query", "posts", fi.arguments || {});
  });
}

export const createUrqlClient = (ssrExchange: any, ctx: any) => {
  let cookie = "";
  if (isServer()) {
    cookie = ctx?.req?.headers?.cookie;
  }

  return {
    url: process.env.NEXT_PUBLIC_API_URL as string,
    fetchOptions: {
      //sends the register/login cookie
      credentials: "include" as const,
      headers: cookie
        ? {
            cookie,
          }
        : undefined,
    },
    exchanges: [
      dedupExchange,
      cacheExchange({
        keys: {
          PaginatedPosts: () => null,
        },
        resolvers: {
          Query: {
            posts: cursorPagination(), //from GraphQL
          },
        },
        updates: {
          Mutation: {
            deletePost: (_result, args, cache, info) => {
              cache.invalidate({
                __typename: "Post",
                id: (args as DeletePostMutationVariables).id,
              });
            },
            //update the cache for vote
            vote: (_result, args, cache, info) => {
              const { postId, value } = args as VoteMutationVariables;
              const data = cache.readFragment(
                gql`
                  fragment _ on Post {
                    id
                    points
                    voteStatus
                  }
                `,
                { id: postId } as any
              );

              //update vote value
              if (data) {
                //vote only once
                if (data.voteStatus === value) {
                  return;
                }

                //if the vote is being changed / first time voting
                const newPoints =
                  (data.points as number) + (!data.voteStatus ? 1 : 2) * value;
                cache.writeFragment(
                  gql`
                    fragment __ on Post {
                      points
                      voteStatus
                    }
                  `,
                  { id: postId, points: newPoints, voteStatus: value } as any
                );
              }
            },
            //add the post to the DB so it will always be 1st
            createPost: (_result, args, cache, info) => {
              invalidateAllPosts(cache);
            },
            logout: (_result, args, cache, info) => {
              //update the query
              betterUpdateQuery<LogoutMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                () => ({ me: null })
              );
            },
            login: (_result, args, cache, info) => {
              //cache.updateQuery({ query: MeDocument }, (data: MeQuery) => {});
              betterUpdateQuery<LoginMutation, MeQuery>(
                cache,
                {
                  query: MeDocument,
                },
                _result,
                (result, query) => {
                  if (result.login.errors) {
                    return query;
                  } else {
                    return {
                      me: result.login.user,
                    };
                  }
                }
              );
              //invalidate the query nedded to refetch the votes
              invalidateAllPosts(cache);
            },
            register: (_result, args, cache, info) => {
              //cache.updateQuery({ query: MeDocument }, (data: MeQuery) => {});
              betterUpdateQuery<RegisterMutation, MeQuery>(
                cache,
                {
                  query: MeDocument,
                },
                _result,
                (result, query) => {
                  if (result.register.errors) {
                    return query;
                  } else {
                    return {
                      me: result.register.user,
                    };
                  }
                }
              );
            },
          },
        },
      }),
      errorExchange,
      ssrExchange,
      fetchExchange,
    ],
  };
};

import { Box, Button, Flex, Heading, Stack, Text, Link } from "@chakra-ui/core";
//import { withUrqlClient } from "next-urql";
import NextLink from "next/link";
//import { useState } from "react";
import { Layout } from "../components/Layout";
import { VoteSection } from "../components/VoteSection";
import { EditDeletePostButtons } from "../components/EditDeletePostButtons";
import { Container } from "../components/Container";
import { DarkModeSwitch } from "../components/DarkModeSwitch";
import { usePostsQuery } from "../generated/graphql";
//import { createUrqlClient } from "../utils/createUrqlClient";
import { withApollo } from "../utils/withApollo";

const Index = () => {
  const { data, error, loading, fetchMore, variables } = usePostsQuery({
    variables: {
      limit: 10,
      cursor: null,
    },
    notifyOnNetworkStatusChange: true,
  });

  if (!loading && !data) {
    return (
      <div>
        <div>Query failed</div>
        <div>{error?.message}</div>
      </div>
    );
  }

  return (
    <Container height="100vh">
      <Layout>
        {!data && loading ? (
          <div> loading... </div>
        ) : (
          <Box>
            <Flex paddingBottom="10px">
              <Box flex={1} fontSize="2xl">Posts feed</Box>
            </Flex>
            <Box>
              <Stack spacing={8}>
                {data!.posts.posts.map((p) =>
                  !p ? null : (
                    <Flex key={p.id} p={5} shadow="md" borderWidth="2px">
                      <VoteSection post={p} />
                      <Box flex={1}>
                        <NextLink href="/post/[id]" as={`/post/${p.id}`}>
                          <Link>
                            <Heading fontSize="xl">{p.title}</Heading>
                          </Link>
                        </NextLink>
                        <Text>posted by {p.creator.username}</Text>
                        <Flex>
                          <Text flex={1} mt={4}>
                            {p.textSnippet}
                          </Text>
                          <Box ml="auto">
                            <EditDeletePostButtons
                              id={p.id}
                              creatorId={p.creator.id}
                            />
                          </Box>
                        </Flex>
                      </Box>
                    </Flex>
                  )
                )}
              </Stack>
            </Box>
          </Box>
        )}
        {data && data.posts.hasMore ? (
          <Flex>
            <Button
              onClick={() => {
                fetchMore({
                  variables: {
                    limit: variables?.limit,
                    cursor:
                      data.posts.posts[data.posts.posts.length - 1].createdAt,
                  },
                });
              }}
              isLoading={loading}
              m="auto"
              my={8}
            >
              Show more
            </Button>
          </Flex>
        ) : null}

        <DarkModeSwitch />
      </Layout>
    </Container>
  );
};

export default withApollo({ ssr: true })(Index);

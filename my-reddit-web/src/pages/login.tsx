import React from "react";
import { Form, Formik } from "formik";
import { Box, Button, Link, Flex, Text } from "@chakra-ui/core";
import { Wrapper } from "../components/Wrapper";
import { InputField } from "../components/InputField";
import { useRouter } from "next/dist/client/router";
import { useLoginMutation, MeQuery, MeDocument } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
//import { withUrqlClient } from "next-urql";
//import { createUrqlClient } from "../utils/createUrqlClient";
import NextLink from "next/link";
import { withApollo } from "../utils/withApollo";

const Login: React.FC<{}> = ({}) => {
  //next.js router
  const router = useRouter();
  //URQL hooks
  const [login] = useLoginMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ usernameOrEmail: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login({
            variables: values,
            update: (cache, { data }) => {
              cache.writeQuery<MeQuery>({
                query: MeDocument,
                data: {
                  __typename: "Query",
                  me: data?.login.user,
                },
              });
              cache.evict({ fieldName: "posts:{}" });
            },
          });
          //undefined if there is no data
          if (response.data?.login.errors) {
            //errors
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            // if register, query is string ==> OK -> next or home page
            if (typeof router.query.next === "string") {
              router.push(router.query.next);
            } else {
              //if undefined -> home
              router.push("/");
            }
          }
        }}
      >
        {({ isSubmitting }) => (
          <Flex p={5} shadow="md" borderWidth="2px">
            <Box flex={1}>
              <Text
                textAlign="center"
                color="teal.600"
                fontSize="4xl"
                paddingBottom={2}
              >
                Login
              </Text>
              <Form>
                <InputField
                  name="usernameOrEmail"
                  placeholder="Username or Email"
                  label="Username or Email"
                />
                {/* <Box mt={4}>
                  <InputField name="email" placeholder="email" label="Email" />
                </Box> */}
                <Box mt={4}>
                  <InputField
                    name="password"
                    placeholder="password"
                    label="Password"
                    type="password"
                  />
                </Box>
                <Flex mt={2}>
                  <NextLink href="/forgot-password">
                    <Link ml="auto">forgot password?</Link>
                  </NextLink>
                </Flex>
                <Box textAlign="center">
                  <Button
                    mt={4}
                    type="submit"
                    isLoading={isSubmitting}
                    variantColor="teal"
                  >
                    Login
                  </Button>
                </Box>
              </Form>
            </Box>
          </Flex>
        )}
      </Formik>
    </Wrapper>
  );
};

export default withApollo({ ssr: false })(Login);

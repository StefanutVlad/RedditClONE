import React, { useState } from "react";
//import { withUrqlClient } from "next-urql";
//import { createUrqlClient } from "../utils/createUrqlClient";
import NextLink from "next/link";
import { Wrapper } from "../components/Wrapper";
import { Formik, Form } from "formik";
import { InputField } from "../components/InputField";
import { Box, Button, Flex, Link, Text } from "@chakra-ui/core";
import { useForgotPasswordMutation } from "../generated/graphql";
import { withApollo } from "../utils/withApollo";

export const ForgotPassword: React.FC<{}> = ({}) => {
  const [complete, setComplete] = useState(false);
  const [forgotPassword] = useForgotPasswordMutation();

  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "" }}
        onSubmit={async (values) => {
          await forgotPassword({ variables: values });
          setComplete(true);
        }}
      >
        {({ isSubmitting }) =>
          complete ? (
            <Flex p={5} shadow="md" borderWidth="2px">
              <Box>
                <Text textAlign="center">
                  If an account with that email exists, we sent you an email
                </Text>
                <NextLink href="/">
                  <Flex textAlign="center" p={1}>
                    <Box flex={1}>
                      <Button as={Link} variantColor="teal">
                        Return home
                      </Button>
                    </Box>
                  </Flex>
                </NextLink>
              </Box>
            </Flex>
          ) : (
            <Flex p={5} shadow="md" borderWidth="2px">
              <Box flex={1}>
                <Form>
                  <InputField
                    name="email"
                    placeholder="email"
                    label="Email"
                    type="email"
                  />
                  <Box textAlign="center">
                    <Button
                      mt={4}
                      type="submit"
                      isLoading={isSubmitting}
                      variantColor="teal"
                    >
                      Forgot password
                    </Button>
                  </Box>
                </Form>
              </Box>
            </Flex>
          )
        }
      </Formik>
    </Wrapper>
  );
};

export default withApollo({ ssr: false })(ForgotPassword);

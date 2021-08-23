import React from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/core";
import { Form, Formik } from "formik";
import { InputField } from "../components/InputField";
import { Wrapper } from "../components/Wrapper";
import { useRegisterMutation, MeQuery, MeDocument } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
//import { withUrqlClient } from "next-urql";
//import { createUrqlClient } from "../utils/createUrqlClient";
import { withApollo } from "../utils/withApollo";

interface registerProps {}

const Register: React.FC<registerProps> = ({}) => {
  //next.js router
  const router = useRouter();
  //URQL hooks
  const [register] = useRegisterMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "", username: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await register({
            variables: { options: values },
            update: (cache, { data }) => {
              cache.writeQuery<MeQuery>({
                query: MeDocument,
                data: {
                  __typename: "Query",
                  me: data?.register.user,
                },
              });
            },
          });
          //undefined if there is no data
          if (response.data?.register.errors) {
            //errors
            setErrors(toErrorMap(response.data.register.errors));
          } else if (response.data?.register.user) {
            // if register = OK -> home page
            router.push("/");
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
                Register
              </Text>
              <Form>
                <InputField
                  name="username"
                  placeholder="username"
                  label="Username"
                />
                <Box mt={4}>
                  <InputField name="email" placeholder="email" label="Email" />
                </Box>
                <Box mt={4}>
                  <InputField
                    name="password"
                    placeholder="password"
                    label="Password"
                    type="password"
                  />
                </Box>
                <Box textAlign="center">
                  <Button
                    mt={4}
                    type="submit"
                    isLoading={isSubmitting}
                    variantColor="teal"
                  >
                    Register
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

export default withApollo({ ssr: false })(Register);

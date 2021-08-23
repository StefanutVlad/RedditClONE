import { Box, Button, Flex } from "@chakra-ui/core";
import { Formik, Form } from "formik";
//import { withUrqlClient } from "next-urql";
import { useRouter } from "next/router";
import React from "react";
import { InputField } from "../components/InputField";
import { Layout } from "../components/Layout";
import { useCreatePostMutation } from "../generated/graphql";
//import { createUrqlClient } from "../utils/createUrqlClient";
import { userIsAuth } from "../utils/userIsAuth";
import { withApollo } from "../utils/withApollo";

const CreatePost: React.FC<{}> = ({}) => {
  //to check the user is logged
  const router = useRouter();
  //custom hook - check if user is logged
  userIsAuth;
  const [createPost] = useCreatePostMutation();

  return (
    <Layout variant="small">
      <Formik
        initialValues={{ title: "", text: "" }}
        onSubmit={async (values) => {
          const { errors } = await createPost({
            variables: { input: values },
            update: (cache) => {
              cache.evict({ fieldName: "posts:{}" });
            },
          });
          //push if no errors creating the post
          if (!errors) {
            router.push("/");
          }
        }}
      >
        {({ isSubmitting }) => (
          <Flex p={5} shadow="md" borderWidth="2px">
            <Box flex={1}>
              <Box
                textAlign="center"
                color="teal.600"
                fontSize="4xl"
                paddingBottom={2}
              >
                Create Post
              </Box>
              <Form>
                <InputField name="title" placeholder="title" label="Ttitle" />
                <Box mt={4}>
                  <InputField
                    textarea
                    name="text"
                    placeholder="text..."
                    label="Body"
                  />
                </Box>
                <Box textAlign="center">
                  <Button
                    mt={4}
                    type="submit"
                    isLoading={isSubmitting}
                    variantColor="teal"
                  >
                    Create post
                  </Button>
                </Box>
              </Form>
            </Box>
          </Flex>
        )}
      </Formik>
    </Layout>
  );
};

export default withApollo({ ssr: false })(CreatePost);

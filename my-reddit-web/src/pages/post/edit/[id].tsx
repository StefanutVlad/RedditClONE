import { Box, Button, Flex } from "@chakra-ui/core";
import { Formik, Form } from "formik";
import { useRouter } from "next/router";
import React from "react";
import { InputField } from "../../../components/InputField";
import { Layout } from "../../../components/Layout";
import {
  usePostQuery,
  useUpdatePostMutation,
} from "../../../generated/graphql";
import { useGetIntId } from "../../../utils/useGetIntId";
import { withApollo } from "../../../utils/withApollo";

const EditPost = ({}) => {
  const router = useRouter();
  const intId = useGetIntId(); //get id from url
  const { data, loading } = usePostQuery({
    skip: intId === -1,
    variables: {
      id: intId,
    },
  });
  const [updatePost] = useUpdatePostMutation();

  if (loading) {
    return (
      <Layout>
        <div>lodaing...</div>
      </Layout>
    );
  }

  if (!data?.post) {
    return (
      <Layout>
        <Box>Post not found</Box>
      </Layout>
    );
  }

  return (
    <Layout variant="small">
      <Formik
        initialValues={{ title: data.post.title, text: data.post.text }}
        onSubmit={async (values) => {
          await updatePost({ variables: { id: intId, ...values } });
          router.back(); //back to the before page
        }}
      >
        {({ isSubmitting }) => (
          <Flex p={5} shadow="md" borderWidth="2px">
            <Box flex={1}>
              <Form>
                <InputField name="title" placeholder="title" label="Title" />
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
                    Update post
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

export default withApollo({ ssr: false })(EditPost);

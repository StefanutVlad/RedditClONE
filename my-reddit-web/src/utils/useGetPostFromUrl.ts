// import { utimes } from "fs";
import { usePostQuery } from "../generated/graphql";
import { useGetIntId } from "./useGetIntId";

//custom hook - get post id from url
export const useGetPostFromUrl = () => {
  const intId = useGetIntId();

  return usePostQuery({
    skip: intId === -1,
    variables: {
      id: intId,
    },
  });
};

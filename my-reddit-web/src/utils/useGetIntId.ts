import { useRouter } from "next/router"

//custom hook - get post id 
export const useGetIntId = () => {
    const router = useRouter();
    const intId = typeof router.query.id === "string" ? parseInt(router.query.id) : -1;

    return intId;
}
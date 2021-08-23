import { useMeQuery } from "../generated/graphql"
import { useRouter } from "next/router";
import { useEffect } from "react";


//custom hook - check is auth custom hook
export const userIsAuth = () => {
    const { data, loading } = useMeQuery(); //to check if there is an user
    const router = useRouter();
    
    useEffect(() => {
        //if there is not an user
        if(!loading && !data?.me) {
            router.replace("/login?next="+router.pathname);
        }
    }, [loading, data, router]);
}
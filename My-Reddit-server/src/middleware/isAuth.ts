
import { MiddlewareFn } from "type-graphql";
import { MyContext } from "../types";

//middlewre function that checks if the user is auth
export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new Error("not authenticated");
  }
  
  return next();
};

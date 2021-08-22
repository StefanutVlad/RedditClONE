import {
  Resolver,
  Mutation,
  Arg,
  Field,
  Ctx,
  ObjectType,
  Query,
  FieldResolver,
  Root,
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { getConnection } from "typeorm";

//errors object
@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

//user login response object
@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User;
}

@Resolver(User)
export class UserResolver {
    @FieldResolver(() => String)
    email(@Root() user: User, @Ctx() { req }: MyContext) {
    // this is the current user and its ok to show them their own email
        if (req.session.userId === user.id) {
         return user.email;
        }
    // current user wants to see someone elses email
        return "";  //if null => error
    }

    @Mutation(() => UserResponse)
    async changePassword(
        @Arg("token") token: string,
        @Arg("newPassword") newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return {
                errors: [
                {
                    field: "newPassword",
                    message: "length must be greater than 2",
                },
            ],
        };
        }

        const key = FORGET_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        
        if (!userId) {
            return {
                errors: [
                    {
                    field: "token",
                    message: "token expired",
                    },
                ],
            };
        }

        //update user - current user
        const userIdNum = parseInt(userId);
        const user = await User.findOne(userIdNum);

        if (!user) {
            return {
                errors: [
                    {
                    field: "token",
                    message: "user no longer exists",
                    },
                ],
            };
        }

        await User.update({ id: userIdNum },
            { password: await argon2.hash(newPassword), }
        );

        //remove the key so it can't be used again
        await redis.del(key);

        // log in user after change password
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() { redis }: MyContext
    ) {
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            // the email is not in the db
            return true;
        }

        //generate token (random string) to know who the user is
        const token = v4();

        //store the token in redis
        await redis.set(
            FORGET_PASSWORD_PREFIX + token,
            user.id,
            "ex",
            1000 * 60 * 60 * 24 * 1
        ); // 1 day

        await sendEmail(
            email,
            `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
        );

        return true;
    } 

    //me Query --> checks the user
    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
        // you are not logged in
        if (!req.session.userId) {
         return null;
        }

        return User.findOne(req.session.userId);
    }

    //mutation to save  the user to the db
    @Mutation(() => UserResponse)
    async register( 
        @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
        @Ctx() {req}: MyContext
        ) :Promise<UserResponse>{
            // if(options.username.length<=2) {
            //     return {
            //         errors: [{
            //             field: "username",
            //             message: "length must be greater than 2",
            //         }]
            //     }
            // }
            // if(options.password.length<=3) {
            //     return {
            //         errors: [{
            //             field: "password",
            //             message: "length must be greater than 3",
            //         }]
            //     }
            // }
            const errors = validateRegister(options);
            if (errors) {
                return { errors };
            }

            const hashedPassword =await argon2.hash(options.password);
            let user;
            try{
                // User.create({    ->>equivalent with result const below
                //        username: options.username,
                //        email: options.email,
                //        password: hashedPassword,
                //    }).save() 
                
                //query builder result
                const result = await getConnection()
                    .createQueryBuilder()
                    .insert()
                    .into(User)
                    .values({
                        username: options.username,
                        email: options.email,
                        password: hashedPassword,
                    })
                    .returning("*")
                    .execute();
                user = result.raw[0];
            } catch (err) {
                //duplicate username error
                if(err.code === "23505") { 
                    return {
                        errors: [{
                            field: "username",
                            message: "username already taken"
                        }]
                    }
                }
                console.log("message", err.message);
            }

            // store user id session
            // this will set a cookie on the user
            // keep them logged in
            req.session.userId = user.id;

            return { user }; //return response object
        }
    
    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        @Ctx() { req }: MyContext
    ) : Promise<UserResponse>{
        const user = await User.findOne(
            usernameOrEmail.includes("@")
                ? { where: { email: usernameOrEmail } }
                : { where: { username: usernameOrEmail } }
        );

        if(!user) {
            //return errors
            return {
                errors: [{
                    field: "usernameOrEmail",
                    message: "username doesn't exist",
                },]
            };
        }
        const valid = await argon2.verify(user.password, password);
        if(!valid) {
            //return errors
            return {
                errors: [
                    {
                        field: "password",
                        message: "incorrect password",
                    },
                ],
            };
        }

        //store user id into the session
        req.session.userId = user.id;

        return { user }; //return response object
    }

    //logout Mutation
    @Mutation(() => Boolean)
    logout(@Ctx() { req, res }: MyContext) {
        return new Promise((resolve) =>
            //remove the session in redis and clear the cookie
            req.session.destroy((err) => {
                res.clearCookie(COOKIE_NAME);

                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }

                resolve(true);
            })
        );
    }
}

import "reflect-metadata"; //typeorm/mikroOrm needs reflect-metadata to work
import "dotenv-safe/config";
import { __prod__, COOKIE_NAME } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";
import { Vote } from "./entities/Vote";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";
//import { sendEmail } from "./utils/sendEmail";


const main = async () => {
    //send email
    //sendEmail("ton@ton.com","hello ton");


    //connect to db, run the migrations before everything else
   const connection=await createConnection({
        type: "postgres",
        url: process.env.DATABASE_URL,
        //  username: "postgres",
        //  password: "postgres",
        logging: true,
        //synchronize: true,
        migrations: [path.join(__dirname, "./migrations/*")],
        entities: [Post, User, Vote],
    });
    await connection.runMigrations();

    //await Post.delete({});

    const app = express();

    const RedisStore = connectRedis(session);
    const redis = new Redis(process.env.REDIS_URL);
    //proxy environment for nginx - proxy sitting in front - cookies,sessions will work
    app.set("trust proxy", 1); 
    app.use(
        cors({
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        })
    );
    //session middleware which will be used inside of apollo
    app.use(
        session({
            name: COOKIE_NAME, //cookie name
            store: new RedisStore({
                client: redis,
                disableTouch: true, //disable resetting the TTL - keeps the session alive forever
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // available for 10 years
                httpOnly: true, //cannot acces the cookie in frontend
                sameSite: "lax", //csrf protection
                secure: __prod__, //cookie only works in https
                domain: __prod__ ? ".redditclone.website" : undefined,
            },
            saveUninitialized: false, //create session by default even if i don t store a data in it
            secret: process.env.SESSION_SECRET,
            resave: false,
        })
    )

    const apolloServer = new ApolloServer({
        //schema
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false,
        }),  
        //context is run on every request
        context: ({req, res}) => ({ 
            req,
            res,
            redis,
            userLoader: createUserLoader(),
            voteLoader: createVoteLoader(),
        }),
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({ 
        app,
        cors: false, 
    });
    
    app.listen(parseInt(process.env.PORT), () => {
        console.log("server started on localhost:4000");
    });
    //RUN SQL: create Post object and inject it into db
    // const post = orm.em.create(Post, {title: "my first post"});
    // await orm.em.persistAndFlush(post);
    
    //  const posts = await orm.em.find(Post, {});
    //  console.log(posts);
};

main().catch(err => {
    console.log(err);
});


import {  
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware, } from "type-graphql";
import { getConnection } from "typeorm";
import { Post } from "../entities/Post";
import { Vote } from "../entities/Vote";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

//pagination class
@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

//CRUD with GraphQL using MikroOrm for a basic entity (Post)
@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { voteLoader, req }: MyContext
  ) {
    //if user not logged in - no vote status
    if (!req.session.userId) {
      return null;
    }

    const vote = await voteLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });

    return vote ? vote.value : null;
  }

  //up/down vote mutation
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    //if the val is not -1 then is upvote
    const isVote = value !== -1;
    const realValue = isVote ? 1 : -1;
    const { userId } = req.session;

    //check the entry in DB
    const vote = await Vote.findOne({ where: { postId, userId } });

    // the user has voted on the post before
    // and they are changing their vote
    if (vote && vote.value !== realValue) {
      await getConnection().transaction(async (transactionManagerObj) => {
        //if user changes the vote => update the sql value
        await transactionManagerObj.query(
          `
    update vote
    set value = $1
    where "postId" = $2 and "userId" = $3
        `,
          [realValue, postId, userId]
        );

        //if user changes the vote from upvote to downvote, we do -2
        await transactionManagerObj.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [2 * realValue, postId]
        );
      });
    } else if (!vote) {
      // if user never voted before
      await getConnection().transaction(async (transactionManagerObj) => {
        await transactionManagerObj.query(
          `
    insert into vote ("userId", "postId", value)
    values ($1, $2, $3)
        `,
          [userId, postId, realValue]
        );

        await transactionManagerObj.query(
          `
    update post
    set points = points + $1
    where id = $2
      `,
          [realValue, postId]
        );
      });
    }
    return true;
  }

  //cursor based pagination Query
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    // 20 -> 21
    const realLimit = Math.min(50, limit);
    //to check if there are more posts to be posted
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne];

    //if we have a cursor, add dates
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
    select p.*
    from post p
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );

    // const qb = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect("p.creator", "u", 'u.id = p."creatorId"')
    //   .orderBy('p."createdAt"', "DESC")
    //   .take(reaLimitPlusOne);

    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await qb.getMany();
    // console.log("posts: ", posts);

    return {
      //slice the number of posts returned
      posts: posts.slice(0, realLimit),
      //check if there are more posts
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth) //logged in permission to update post
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth) //logged in permission to delete post
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext //current user
  ): Promise<boolean> {
    // not cascade way
    // const post = await Post.findOne(id);
    // if (!post) {
    //   return false;
    // }
    // if (post.creatorId !== req.session.userId) {
    //   throw new Error("not authorized");
    // }

    // await Updoot.delete({ postId: id });
    // await Post.delete({ id });

    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}








//MikroOrm

// @Resolver()
// export class PostResolver {
//     @Query(() => [Post]) //set the graphQL type
//     posts(@Ctx() { em }: MyContext): Promise<Post[]>{ //set the TS type
//         return em.find(Post, {}) //return promise of posts
//     }

//     @Query(() => Post, { nullable: true}) //set the graphQL type
//     post(
//         @Arg("id", () => Int) id : number,
//         @Ctx() { em }: MyContext
//     ): Promise<Post | null>{ //set the TS type
//         return em.findOne(Post, { id }) //return promise | null of post
//     }

//     @Mutation(() => Post) //set the graphQL type
//     async createPost(
//         @Arg("title", () => String) title : string,
//         @Ctx() { em }: MyContext
//     ): Promise<Post | null>{ //set the TS type
//         const post = em.create(Post, {title});
//         await em.persistAndFlush(post);
//         return post //return promise | null of post 
//     }

//     @Mutation(() => Post, {nullable: true}) //set the graphQL type
//     async updatePost(
//         @Arg("id", () => Int) id: number,
//         @Arg("title", () => String, {nullable: true}) title : string,
//         @Ctx() { em }: MyContext
//     ): Promise<Post | null>{ //set the TS type
//         const post = await em.findOne(Post, {id});
//         if (!post) {
//             return null;
//         }
//         if (typeof title !== "undefined") {
//             post.title = title;
//             await em.persistAndFlush(post);
//         }
//         return post //return promise | null of post
//     }


//     @Mutation(() => Boolean) //set the graphQL type
//     async deletePost(
//         @Arg("id", () => Int) id: number,
//         @Ctx() { em }: MyContext
//     ): Promise<boolean>{ //set the TS type
//         await em.nativeDelete(Post, { id });
//         return true; // return boolean
//     }
// }
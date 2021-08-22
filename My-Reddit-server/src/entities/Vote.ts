import { Entity, BaseEntity, ManyToOne, PrimaryColumn, Column } from "typeorm";
import { User } from "./User";
import { Post } from "./Post";

// m to n relationship (many to many relationship)
// user <-> posts
// user -> join table(vote) <- posts


//entity for upvotes
@Entity()
export class Vote extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, (user) => user.votes)
  user: User;

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, (post) => post.votes, {
    onDelete: "CASCADE", //when post deleted, db cascade will happen
  })
  post: Post;
}
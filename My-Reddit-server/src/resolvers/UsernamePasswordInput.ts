import { InputType, Field } from "type-graphql";

//forgot-password-setup-email
@InputType()
export class UsernamePasswordInput {
  @Field()
  email: string;
  @Field()
  username: string;
  @Field()
  password: string;
}
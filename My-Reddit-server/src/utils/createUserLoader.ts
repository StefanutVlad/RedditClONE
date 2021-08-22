import DataLoader from "dataloader";
import { User } from "../entities/User";

// [1, 78, 8, 9] -> keys
// [{id: 1, username: 'aa'}, {id: 2, username: 'bb'}, {}, {}] -> data
// the keys will lign up with the data
export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    //fetch the users with these ids 
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};
    users.forEach((u) => {
      userIdToUser[u.id] = u;
    });

    const sortedUsers = userIds.map((userId) => userIdToUser[userId]);
    // console.log("userIds", userIds);
    // console.log("map", userIdToUser);
    // console.log("sortedUsers", sortedUsers);
    return sortedUsers;
  });
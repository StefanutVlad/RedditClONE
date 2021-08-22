import { Vote } from "../entities/Vote";
import DataLoader from "dataloader";

// [{postId: 3, userId: 5}] - the keys will be objects
// [{postId: 3, userId: 5, value: 1}] - return [1]
export const createVoteLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Vote | null>(
    async (keys) => {
      const votes = await Vote.findByIds(keys as any);
      const voteIdsToVote: Record<string, Vote> = {};
      votes.forEach((vote) => {
        //single string key
        voteIdsToVote[`${vote.userId}|${vote.postId}`] = vote;
      });

      return keys.map(
        (key) => voteIdsToVote[`${key.userId}|${key.postId}`]
      );
    }
  );
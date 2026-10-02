// The run's story for the explorer pages, bound to this build's projection. The logic lives in src/lib/narrative.ts
// (pure, shared with the Present captions and the SRT script).
import { run } from "./select";
import { makeStory } from "@/lib/narrative.ts";
export { CIRCLE_DEVNET_USDC, CIRCLE_DEVNET_USDC_URL, DISCLAIMER, RENT_NOTE, confWords, rentSolWords, solText, intentWords, relevanceWords, auctionKind, capChip, capWords, levelsText, list, numWord, rentWords, timesWord, usdcText } from "@/lib/narrative.ts";

export const story = makeStory(run);
export const {
  tableBid,
  winnerCaption,
  auctionSentence,
  noFillSentence,
  historyEffect,
  moveSentence,
  capEvents,
  featuredHistory,
  firstPaid,
  firstTie,
  firstNoFill,
  firstCap,
  earlierSameQuestion,
  clockNote,
  tieFacts,
  network,
  onDevnet,
  runDate,
  runPhrase,
  highlight,
  otherAuctionsLine,
  NET,
  onePayer,
  topicWords,
} = story;

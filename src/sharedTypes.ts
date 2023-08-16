// Please do not import stuff _not from Prisma_ into this file. It is shared between the client and server.
// Only edit this file in the server repository, then copy into the client repository to avoid sync issues.

import { BountyType, RoleType, TestCase } from "../prisma/generated";

// For POST Requests
export type CreateProfilePOSTData = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
};
export type ChangeRolePOSTData = {
  role: RoleType;
};
export type BountyMgrSetQuotePricePOSTData = {
  quotePrice: number;
  projectID: string;
};

export type BountyMgrDeclineProjectPOSTData = {
  projectID: string;
};

export type CreateTeamPOSTData = {
  name: string;
  description: string;
  link: string;
  memberAddressesToInvite: string[];
  creatorAddress: string;
};

export type CreateProjectPOSTData = {
  title: string;
  description: string;
  email: string;
  phone: string;
};

export type InviteToTeamPOSTData = {
  toAddress: string;
  toTeam: string;
};
export type JoinTeamPOSTData = {
  toTeamID: string;
};

export type CreateBountyData = {
  id: string | undefined;
  title: string;
  description: string;
  aboutProject: string;
  reward: number;
  projectID: string;
  postDate: Date;
  deadline: Date;
  types: BountyType[];
  headerSections: { [x: string]: string[] };
};

export type CreateBountyPostData = {
  bounty: CreateBountyData;
  draft: boolean;
};
export type SetApproveBountyPostData = {
  bountyID: string;
  approve: boolean;
};
export type SubmitDeliverablesPostData = {
  bountyID: string;
  teamID: string;
  videoDemo: string;
  repo: string;
};
export type SelectWinningSubmissionPostData = {
  submissionID: string;
};
export type ApproveDisapproveBountyWinnerPostData = {
  submissionID: string;
  approve: boolean;
};
export type ConfirmRewardPostData = {
  submissionWinnerID: string;
};
export type ApproveTestCasePostData = {
  submissionID: string;
  testCases: TestCase[];
};

export type SetTestCasesPostData = {
  bountyID: string;
  testCases: string[];
};

export type StartBountyPOSTData = {
  address: string;
  forTeam: string;
  bountyID: string;
};

export type FounderConfirmPayPostData = {
  projectID: string;
};

// END For POST Requests

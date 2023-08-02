import { app, db } from "../";

import { RoleDict, type Member } from "../sharedTypes";

import * as Types from "../sharedTypes";
import { Request, Response } from "express";
import { GetRole } from "../sharedTypes";
import { v4 as uuid } from "uuid";

export const SAMPLE_MEMBERS: Array<Member> = [
  {
    username: "Sfhwfh",
    firstName: "Sfjafn",
    lastName: "Afhzvn",
    email: "Sfhf@afb.arh",
    bio: "",
    bountiesWon: 0,
    completedWelcome: true,
    level: "",
    membersInvited: 0,
    playingRole: { id: "0", title: "Founder" },
    roles: [],
    teamsJoined: [],
    walletAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
    pendingTeamInvites: [],
  },
  {
    username: "@rocky",
    firstName: "Rocky",
    lastName: "Test",
    email: "test@rocky",
    bio: "lorem20",
    level: "2",
    roles: [GetRole("Bounty Hunter"), GetRole("Bounty Validator")],
    playingRole: RoleDict[1],
    bountiesWon: 24,
    teamsJoined: ["1", "2", "3"],
    membersInvited: 12,
    completedWelcome: true,
    walletAddress: "7A5E0B7D-B202-494F-BB66-174FBE55FDD3",
    pendingTeamInvites: [],
  },
  {
    username: "@comp1",
    firstName: "Comp1",
    lastName: "comp1",
    email: "test@comp1",
    bio: "lorem20",
    level: "3",
    roles: [GetRole("Bounty Hunter"), GetRole("Bounty Hunter")],
    playingRole: RoleDict[2],
    bountiesWon: 21,
    teamsJoined: [],
    membersInvited: 92,
    completedWelcome: true,
    walletAddress: "AB65B816-66A5-4322-A950-453F62C9E86E",
    pendingTeamInvites: [],
  },
  {
    firstName: "Comp2",
    lastName: "comp2",
    email: "",
    username: "@comp2",
    bio: "lorem20",
    level: "4",
    roles: [GetRole("Bounty Hunter"), GetRole("Bounty Designer")],
    playingRole: RoleDict[3],
    bountiesWon: 20,
    teamsJoined: [],
    membersInvited: 21,
    completedWelcome: true,
    walletAddress: "F16849F2-8078-4CA0-8A90-2FE84A36E3F1",
    pendingTeamInvites: [],
  },
  {
    firstName: "Comp3",
    lastName: "",
    username: "@comp4",
    email: "test@comp4",
    bio: "lorem20",
    level: "40",
    roles: [GetRole("Bounty Hunter"), GetRole("Bounty Hunter")],
    playingRole: RoleDict[2],
    bountiesWon: 20,
    teamsJoined: [],
    membersInvited: 21,
    completedWelcome: true,
    walletAddress: "000",
    pendingTeamInvites: [],
  },
];

export async function memberSeed() {
  await db.push("/members", SAMPLE_MEMBERS, true);
}

export function membersSetup() {
  app.get(
    "/get-member-by-wallet-address/:id",
    async (req: Request, res: Response) => {
      // console.log("test");
      const currMembers = (await db.getData("/members")) as
        | Member[]
        | undefined;

      // console.log(req.params.id);
      // console.log(currMembers);
      const member = currMembers?.find(
        (member) => member.walletAddress == req.params.id
      );
      if (!member) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      res.send(member);
    }
  );
  app.post(
    "/get-members-by-wallet-addresses",
    async (req: Request, res: Response) => {
      // console.log("a: ");
      const addresses = req.body.addresses as string[];
      // console.log("a: ", addresses);
      if (!addresses) {
        res.status(400).json({
          message: "No addresses provided",
        });
        return;
      }
      const currMembers = (await db.getData("/members")) as
        | Member[]
        | undefined;

      // console.log(req.params.id);
      // console.log(currMembers);
      const members = currMembers?.filter((member) =>
        addresses.includes(member.walletAddress)
      );
      if (!members) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      res.send(members);
    }
  );

  app.post("/create-profile", async (req: Request, res: Response) => {
    const m = req.body as Types.CreateProfile;
    // console.log(m);
    const localErrors: string[] = [];
    if (!m.username || m.username.trim().length < 3) {
      localErrors.push("Username must be at least 3 characters long");
    }
    if (!m.firstName || m.firstName.trim().length < 2) {
      localErrors.push("First Name must be at least 2 characters long");
    }
    if (!m.lastName || m.lastName.trim().length < 2) {
      localErrors.push("Last Name must be at least 2 characters long");
    }
    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (
      !m.email ||
      m.email.trim().length < 2 ||
      !emailReg.test(m.email.trim())
    ) {
      localErrors.push("Email is required and must be valid");
    }

    if (localErrors.length > 0) {
      res.status(400).send(localErrors);
      return;
    }

    const newMember: Member = {
      username: m.username,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      bio: "",
      bountiesWon: 0,
      completedWelcome: true,
      level: "",
      membersInvited: 0,
      playingRole: RoleDict[0],
      roles: [],
      teamsJoined: [],
      walletAddress: m.walletAddress,
      pendingTeamInvites: [],
    };

    const currMembers = (await db.getData("/members")) as Member[] | undefined;

    if (
      !!currMembers &&
      currMembers?.find((mem) => mem?.walletAddress === m.walletAddress)
    ) {
      res.status(400).json("Member already exists");
      return;
    }
    console.log("error");
    db.push("/members", [...currMembers, newMember]);
    console.log("good");
    res.status(200).send();
    console.log();
  });
}

export async function InviteToTeam(options: {
  teamID: string;
  teamName: string;
  fromAddressName: string;
  fromAddress: string;
  userAddress: string;
}) {
  const {
    teamID,
    fromAddressName: inviterName,
    fromAddress: inviterAddress,
    userAddress,
  } = options;

  const teams = (await db.getData("/teams")) as Types.Team[];
  const members = (await db.getData("/members")) as Member[];
  if (!teams || !members) return "Teams or members not found";
  const team = teams.find((team) => team.id === teamID);
  const member = members.find((member) => member.walletAddress === userAddress);
  if (!team || !member) return "Member or team not found";

  // See if the user is already invited
  if (team.pendingInvites.includes(userAddress)) return "Already invited";
  // console.log(team.pendingInvites);
  // future ... see if user is already in team
  team.pendingInvites.push(userAddress);

  member.pendingTeamInvites.push({
    id: uuid(),
    toTeamId: teamID,
    toTeamName: team.name,
    fromAddress: inviterAddress,
    fromName: inviterName,
  });
  db.push("/members", members);
}

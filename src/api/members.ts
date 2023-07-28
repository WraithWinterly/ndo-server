import { app, db } from "../";

import { RoleDict, type Member } from "../sharedTypes";

import * as Types from "../sharedTypes";
import { Request, Response } from "express";
import { GetRole } from "../sharedTypes";

export const SAMPLE_MEMBERS: Array<Member> = [
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
    walletAddress: "0F773A3A-AB12-4E01-80E8-B891497A46E1",
  },
];

export async function memberSeed() {
  await db.push("/members", SAMPLE_MEMBERS, true);
}

export function membersSetup() {
  app.get(
    "/get-member-by-wallet-address/:id",
    async (req: Request, res: Response) => {
      console.log("test");
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
    };

    const currMembers = (await db.getObjectDefault("/members")) as
      | Member[]
      | undefined;

    if (
      !!currMembers &&
      currMembers?.find((mem) => mem?.walletAddress === m.walletAddress)
    ) {
      console.log("here");
      res.status(400).json("Member already exists");
      return;
    }

    db.push("/members", [...currMembers, newMember]);
    console.log("good");
    res.status(200).send();
    console.log();
  });
}

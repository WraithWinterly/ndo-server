import { type Bounty } from "../sharedTypes";
import { app, db } from "../";
import { type Project } from "../sharedTypes";
import { Request, Response } from "express";

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: "D283300B-4B62-4142-9A8F-DB9FD1B4AEEE",
    title: "Avalanche",
    description: "lorem10",
    stage: "WaitingBountyMgrQuote",
    email: "test@gmail.com",
    phone: "(207) 444-4444",
    quotePrice: 5_5000,
    bountyIDs: [
      "4B1DF291-5B97-4C31-8DB9-D7AB4C05458F",
      "F8B1B2A7-2CF0-4BFF-9171-0D6233525B28",
    ],
  },
  {
    id: "44BB2F4B-0C08-4447-AEB5-5C977FDB2FF4",
    title: "Booster",
    description: "lorem10",
    stage: "WaitingBountyMgrQuote",
    email: "",
    phone: "",
    quotePrice: 6_000,
    bountyIDs: [
      "A419DF06-3E6F-4101-909C-ECFC7588D232",
      "DCE0766C-206C-474D-91B8-B6CB88C4E793",
    ],
  },
  {
    id: "7943287A-2166-4FA5-B61C-9CA737742EB6",
    title: "Treasure",
    description: "lorem10",
    stage: "WaitingBountyMgrQuote",
    email: "",
    phone: "",
    quotePrice: 5_000,
    bountyIDs: ["CFE5C84A-FA10-4C99-ABD9-D24129965127"],
  },
];

export async function projectsSeed() {
  await db.push("/projects", SAMPLE_PROJECTS, true);
}

export function projectsSetup() {
  app.get("/get-projects", async (req: Request, res: Response) => {
    const currProjects = (await db.getObjectDefault("/projects", undefined)) as
      | Project[]
      | undefined;
    // console.log("get");
    res.send(currProjects);
  });
  app.get(
    "/get-bounties-for-project/:id",
    async (req: Request, res: Response) => {
      // console.log("dynamic route");
      const bounties = (await db.getObjectDefault("/bounties", undefined)) as
        | Bounty[]
        | undefined;
      const projects = (await db.getObjectDefault("/projects", undefined)) as
        | Project[]
        | undefined;
      const targetProject = projects?.find((proj) => proj.id == req.params.id);

      const targetBounties = bounties?.filter((bounty) =>
        targetProject?.bountyIDs.includes(bounty.id)
      );
      // console.log("t: ", targetBounties);

      res.send(targetBounties);
    }
  );
}

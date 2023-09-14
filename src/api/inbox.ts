import { app, dbMembers, dbNotifications } from "..";
import {
  RemoveNotificationPOSTData,
  Member,
  NotificationType,
  RoleType,
} from "../sharedTypes";
import { v4 as uuid } from "uuid";
import admin, { firestore } from "firebase-admin";
import {
  ProtectedRequest,
  authenticateMember,
  authenticateToken,
  validateFields,
} from "../utils";
import { Response } from "express";

export function notificationSetup() {
  app.get(
    "/get-notifications",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);

      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }

      const notifications = (
        await dbNotifications.where("memberID", "==", member.id).get()
      ).docs.map((doc) => doc.data());
      notifications.sort((a, b) => {
        return (
          (b.createdAt as firestore.Timestamp).toMillis() -
          (a.createdAt as firestore.Timestamp).toMillis()
        );
      });
      return res.status(200).json(notifications);
    }
  );
  app.post(
    "/remove-notification",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const fields = validateFields<RemoveNotificationPOSTData>(
        [{ name: "notificationID" }],
        req.body,
        res
      );
      if (!fields) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { notificationID } = fields;

      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }

      await dbNotifications.doc(notificationID).delete();
      await dbMembers.doc(member.id).update({
        notificationIDs: admin.firestore.FieldValue.arrayRemove(notificationID),
      });
      return res.status(200).json({ message: "Success" });
    }
  );
}

export default async function sendNotification(options: {
  notificationType: NotificationType;
  teamID?: string;
  teamName?: string;
  bountyID?: string;
  bountyName?: string;
  projectID?: string;
  projectName?: string;
  submissionID?: string;
  founderID?: string;
  teamCreatorID?: string;
}) {
  const {
    notificationType,
    teamID,
    teamName,
    bountyID,
    bountyName,
    submissionID,
    projectID,
    projectName,
    founderID,
    teamCreatorID,
  } = options;

  let members: Array<Member> = [];

  switch (notificationType) {
    case NotificationType.ToBM_ProposalCreated:
      members = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      break;
    case NotificationType.ToFounder_BMQuoted:
      members.push((await dbMembers.doc(founderID).get()).data() as Member);
      break;
    case NotificationType.ToBMOfficer_FounderAcceptedQuote:
      members = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .where("isOfficer", "==", true)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      break;
    case NotificationType.ToFounder_BountyMgrDeclined:
      members.push((await dbMembers.doc(founderID).get()).data() as Member);
      break;
    case NotificationType.ToBMBDFounder_ReadyForBountyDesign:
      const managers = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      const designers = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyDesigner)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      members = combineArrayNoDupes(managers, designers);
      if (!members.map((member) => member.id).includes(founderID)) {
        members.push((await dbMembers.doc(founderID).get()).data() as Member);
      }
      break;
    case NotificationType.ToBMBVFounder_BountyNeedsApproval:
      const managersv = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      const designersv = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyDesigner)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      members = combineArrayNoDupes(managersv, designersv);
      if (!members.map((member) => member.id).includes(founderID)) {
        members.push((await dbMembers.doc(founderID).get()).data() as Member);
      }
      break;
    case NotificationType.ToBMBDBVFounder_BountyApproved:
      const managersvvv = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      const designersvvv = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyDesigner)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      const validators = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyValidator)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];

      const m1 = combineArrayNoDupes(managersvvv, designersvvv);
      const m2 = combineArrayNoDupes(m1, validators);
      members = m2;
      if (!members.map((member) => member.id).includes(founderID)) {
        members.push((await dbMembers.doc(founderID).get()).data() as Member);
      }

      break;
    case NotificationType.ToBV_SubmissionSubmitted:
      members = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyValidator)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      break;
    case NotificationType.ToBH_SubmissionApproved:
      members.push((await dbMembers.doc(teamCreatorID).get()).data() as Member);
      break;
    case NotificationType.ToBH_SubmissionRejected:
      members.push((await dbMembers.doc(teamCreatorID).get()).data() as Member);
      break;
    case NotificationType.ToBMFounder_WinnerSelected:
      members = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      if (!members.map((member) => member.id).includes(founderID)) {
        members.push((await dbMembers.doc(founderID).get()).data() as Member);
      }
      break;
    case NotificationType.ToBHBVOfficerFounder_WinnerApproved:
      members = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyValidator)
          .where("isOfficer", "==", true)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      if (!members.map((member) => member.id).includes(teamCreatorID)) {
        members.push(
          (await dbMembers.doc(teamCreatorID).get()).data() as Member
        );
      }
      if (!members.map((member) => member.id).includes(founderID)) {
        members.push((await dbMembers.doc(founderID).get()).data() as Member);
      }
      break;
    case NotificationType.ToBMBVFounder_WinnerRejected:
      const managersvv = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyManager)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      const designersvv = (
        await dbMembers
          .where("roles", "array-contains", RoleType.BountyValidator)
          .get()
      ).docs.map((doc) => doc.data()) as Member[];
      members = combineArrayNoDupes(managersvv, designersvv);
      if (!members.map((member) => member.id).includes(founderID)) {
        members.push((await dbMembers.doc(founderID).get()).data() as Member);
      }
      break;
  }

  const promises = members.map(async (member: Member) => {
    const id = uuid();
    await dbNotifications.doc(id).set({
      id,
      memberID: member.id,
      teamID: teamID || "",
      teamName: teamName || "",
      bountyID: bountyID || "",
      bountyName: bountyName || "",
      submissionID: submissionID || "",
      projectID: projectID || "",
      projectName: projectName || "",
      type: notificationType,
      createdAt: firestore.Timestamp.now(),
    });
    await dbMembers.doc(member.id).update({
      notificationIDs: admin.firestore.FieldValue.arrayUnion(id),
    });
  });
  await Promise.all(promises);
}

export function combineArrayNoDupes(arr1: Array<Member>, arr2: Array<Member>) {
  // Concatenate the two arrays
  const combined = arr1.concat(arr2);

  // Reduce the combined array to ensure unique ids
  const uniqueMembers = combined.reduce((acc, member) => {
    // If the member id is not already in the accumulator, add the member to it
    if (!acc.some((m) => m.id === member.id)) {
      acc.push(member);
    }
    return acc;
  }, []);
  return uniqueMembers;
}

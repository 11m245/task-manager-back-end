import { ObjectId } from "mongodb";
import { client } from "../index.js";

export async function addMailInDB(data) {
  return await client.db("dailySavingsApp").collection("mails").insertOne(data);
}

export async function updateMailStatus(mailID, newStatus) {
  //   console.log("in update fn", mailID);
  return await client
    .db("dailySavingsApp")
    .collection("mails")
    .updateOne(
      {
        _id: mailID,
      },
      { $set: { isSent: newStatus, completedAt: Date.now() } }
    );
}
export async function getUnSentMails() {
  return await client
    .db("dailySavingsApp")
    .collection("mails")
    .find({
      isSent: false,
    })
    .toArray();
}

export async function deleteOlderSentMails() {
  return await client
    .db("dailySavingsApp")
    .collection("mails")
    .deleteMany({
      isSent: true,
      completedAt: { $lte: Date.now() - 86400000 * 3 },
    })
    .toArray();
}

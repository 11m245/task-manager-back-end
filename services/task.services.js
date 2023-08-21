import { client } from "../index.js";
export async function addTaskInDB(data) {
  return await client.db("taskManagerApp").collection("tasks").insertOne(data);
}
export async function getShopTasksFromObjectID(id) {
  return await client
    .db("taskManagerApp")
    .collection("tasks")
    .find({ shopId: id })
    .toArray();
}

export async function getOperatorTasksFromObjectID(id) {
  return await client
    .db("taskManagerApp")
    .collection("tasks")
    .find({ assignedUser: id })
    .toArray();
}

export async function getTaskFromObjectID(id) {
  return await client
    .db("taskManagerApp")
    .collection("tasks")
    .findOne({ _id: id });
}

export async function checkAlreadyCompletedTask(id) {
  return await client
    .db("taskManagerApp")
    .collection("tasks")
    .findOne({ _id: id, isCompleted: true });
}

export async function updateTaskAsCompleted(taskId, userId, newHistoryObj) {
  return await client
    .db("taskManagerApp")
    .collection("tasks")
    .updateOne(
      { _id: taskId },
      { $push: { history: newHistoryObj }, $set: { isCompleted: true } }
    );
}

import express, { response } from "express";
import {
  getShopFromObjectID,
  getShopIdFromLoginToken,
} from "../services/shop.services.js";
import {
  addTaskInDB,
  checkAlreadyCompletedTask,
  getOperatorTasksFromObjectID,
  getShopTasksFromObjectID,
  getTaskFromObjectID,
  updateTaskAsCompleted,
} from "../services/task.services.js";
import { ObjectId } from "mongodb";
const router = express.Router();

router.post("/new", async function (req, res) {
  try {
    const logintoken = req.headers.logintoken;
    const token = await getShopIdFromLoginToken(logintoken);
    const data = req.body;
    const formattedTaskData = {
      description: data.description,
      assignedUser: new ObjectId(data.assignedUser),
      customerName: data.customerName,
      customerMobile: data.customerMobile,
      createdAt: new Date().getTime(),
      isCompleted: false,
      shopId: token.userId,
      history: [
        {
          timeStamp: new Date().getTime(),
          updatedBy: token.userId,
          reason: "created",
        },
      ],
    };
    const addTaskResponse = await addTaskInDB(formattedTaskData);
    // console.log("add task res", addTaskResponse);
    if (addTaskResponse.acknowledged === true) {
      res.send({ mesage: "task added" });
    } else {
      res.status(500).send({ mesage: "task not added" });
    }
  } catch (err) {
    console.log("error in task creation", err);
  }
});

router.get("/myShopTasks", async function (req, res) {
  try {
    const logintoken = req.headers.logintoken;
    const token = await getShopIdFromLoginToken(logintoken);
    const tasks = await getShopTasksFromObjectID(token.userId);
    if (tasks?.length > 0) {
      res.send({ message: "tasks fetched", payload: { tasks: tasks } });
    } else {
      res.status(400).send({ message: "no tasks fetched" });
    }
  } catch (err) {
    console.log("error in task fetch", err);
  }
});

router.get("/operatorTasks", async function (req, res) {
  try {
    const logintoken = req.headers.logintoken;
    // console.log("logintoken", logintoken);
    const token = await getShopIdFromLoginToken(logintoken);
    const tasks = await getOperatorTasksFromObjectID(token.userId);
    // console.log("op tasks", tasks);
    if (tasks?.length > 0) {
      res.send({
        message: "operator tasks fetched",
        payload: { tasks: tasks },
      });
    } else {
      res.status(400).send({ message: "no operator tasks fetched" });
    }
  } catch (err) {
    console.log("error in operator task fetch", err);
  }
});

router.get("/:id", async function (req, res) {
  try {
    const taskId = req.params;

    const task = await getTaskFromObjectID(new ObjectId(taskId));
    if (task) {
      res.send({ message: "task fetched", payload: { task: task } });
    } else {
      res.status(400).send({ message: "no task fetched" });
    }
  } catch (err) {
    console.log("error in task fetch", err);
  }
});

router.put("/complete/:id", async function (req, res) {
  try {
    const { id: taskId } = req.params;
    // console.log("params id", taskId);
    if (await checkAlreadyCompletedTask(new ObjectId(taskId))) {
      // console.log(
      //   "already completed db res",
      //   await checkAlreadyCompletedTask(new ObjectId(taskId))
      // );
      res.status(400).send({ message: "already task completed" });
    } else {
      const logintoken = req.headers.logintoken;
      const token = await getShopIdFromLoginToken(logintoken);
      const tokenedUserId = token.userId;
      const newHistoryObj = {
        timeStamp: new Date().getTime(),
        updatedBy: tokenedUserId,
        reason: "completed",
      };
      const taskUpdateResponse = await updateTaskAsCompleted(
        new ObjectId(taskId),
        tokenedUserId,
        newHistoryObj
      );
      // console.log("task complete response", taskUpdateResponse);
      if (taskUpdateResponse.modifiedCount > 0) {
        res.send({ message: "task updated" });
      } else {
        res.status(500).send({ message: "task not updated" });
      }
    }
  } catch (err) {
    console.log("error in task completion", err);
  }
});
export default router;

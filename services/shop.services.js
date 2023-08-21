import { client } from "../index.js";
export async function checkShopAlreadyExist(data) {
  const { email } = data;
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .findOne({ email: email });
}
export async function addShopInDB(data) {
  return await client.db("taskManagerApp").collection("shops").insertOne(data);
}
export async function getShopFromObjectID(id) {
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .findOne({ _id: id });
}

export async function getShopOperatorsFromObjectID(id) {
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .find({ shopId: id, isOperator: true }, { projection: { password: 0 } })
    .toArray();
}

export async function saveActivationTokenInDB(data) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .insertOne(data);
}

export async function getShopFromActivationToken(token) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .findOne({ $and: [{ type: "activation" }, { token: token }] });
}

export async function activateShopInDB(id) {
  await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .updateOne(
      { $and: [{ type: "activation" }, { ShopId: id }] },
      { $set: { isExpired: true } }
    );
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .updateOne({ _id: id }, { $set: { isActivated: true } });
}
export async function getshopFromDBByEmail(email) {
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .findOne({ email: email });
}

export async function getShopActivationTokenFromObjectID(objId) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .findOne({ $and: [{ shopId: objId }, { type: "activation" }] });
}

export async function saveLoginToken(shopFromDB, token) {
  const formattedData = {
    userId: shopFromDB._id,
    type: "login",
    createdAt: Date.now(),
    token: token,
    isExpired: false,
  };
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .insertOne(formattedData);
}

export async function saveResetTokenInDB(shopFromDB, token) {
  const formattedData = {
    shopId: shopFromDB._id,
    type: "reset",
    createdAt: Date.now(),
    token: token,
    isExpired: false,
  };
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .insertOne(formattedData);
}

export async function getShopIdFromResetToken(resetToken) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .findOne({
      $and: [{ type: "reset" }, { token: resetToken }, { isExpired: false }],
    });
}
export async function updatePasswordInDB(email, newPassword) {
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .updateOne({ email: email }, { $set: { password: newPassword } });
}

export async function makeResetTokenExpire(resetToken) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .updateOne(
      { $and: [{ type: "reset" }, { token: resetToken }] },
      { $set: { isExpired: true } }
    );
}

export async function getShopIdFromLoginToken(logintoken) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .findOne({
      $and: [{ type: "login" }, { token: logintoken }, { isExpired: false }],
    });
}

export async function getShopProfileFromId(id) {
  return await client
    .db("taskManagerApp")
    .collection("shops")
    .findOne({ _id: id }, { projection: { password: 0 } });
}

export async function makeLoginTokenExpire(logintoken) {
  return await client
    .db("taskManagerApp")
    .collection("shopTokens")
    .updateOne(
      { $and: [{ type: "login" }, { token: logintoken }] },
      { $set: { isExpired: true } }
    );
}

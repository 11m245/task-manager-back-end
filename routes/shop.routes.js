import express from "express";
import jwt from "jsonwebtoken";
import { sendMail } from "../index.js";
import {
  activateShopInDB,
  addShopInDB,
  checkShopAlreadyExist,
  getShopActivationTokenFromObjectID,
  getShopFromActivationToken,
  getShopFromDBByEmail,
  getShopFromObjectID,
  getShopIdFromLoginToken,
  getShopIdFromResetToken,
  getShopProfileFromId,
  makeResetTokenExpire,
  saveActivationTokenInDB,
  saveLoginToken,
  updatePasswordInDB,
} from "../services/shop.services.js";
const router = express.Router();
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
function checkValidSignupData(data) {
  const {
    managerName,
    mobile,
    email,
    shopName,
    shopAddress,
    password,
    cpassword,
  } = data;
  const validStatus =
    managerName.length > 2 &&
    mobile.length === 10 &&
    email.length > 7 &&
    shopName.length > 2 &&
    shopAddress.length > 10 &&
    password.length > 7 &&
    password === cpassword;

  // console.log("isValid input", validStatus);
  return validStatus;
}

async function generateHashedPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  return hashedPassword;
}
async function generateActivationToken(shopFromDB) {
  const token = jwt.sign(
    { shopFromDB, date: Date.now() },
    process.env.SECRET_ACTIVATION_KEY
  );
  // console.log("generated token is", token);
  return token;
}

async function mailActivationLink(shopFromDB, activationToken) {
  const url = `${process.env.CLIENT_URL}/activate/${activationToken}`;
  const textContent = `sent by text,Hi ${shopFromDB.managerName}, as you have requested to register, use this link to activate your account. ${url}`;
  const htmlContent = `<div > <p>Hi <b>${shopFromDB.managerName} </b> as you have requested to register, use this link to activate your account.  ${url} or else</p> <b>click this link <a href=${url} target="_blank">Activate Account</a> to activate</b> </div>`;
  const receivers = ["sivaraj2siva@gmail.com"];
  receivers.push(shopFromDB.email);
  await sendMail({
    subject: "Activation Link for Task Manager App",
    sender: {
      name: "Task Manager App",
      mailId: process.env.EMAIL,
    },
    receivers: receivers,
    textContent: textContent,
    htmlContent: htmlContent,
  });
}
router.post("/signup", async function (request, response) {
  const data = request.body;
  // console.log("data is", data);
  const isshopExist = await checkShopAlreadyExist(data);
  // console.log("isshopExist", isshopExist);
  if (isshopExist) {
    response.status(400).send({ message: "Already shop Exist on this email" });
  } else {
    const isValidData = checkValidSignupData(data);
    if (isValidData) {
      const { password, cpassword, ...dataWOP } = data;
      const formattedData = {
        ...dataWOP,
        balance: 0,
        isActivated: false,
        password: await generateHashedPassword(password),
        createdAt: Date.now(),
      };
      // console.log("formatted data", formattedData);
      const result = await addShopInDB(formattedData);
      // console.log("res", result);
      if (result.acknowledged) {
        // console.log("0 inserted id is", result.insertedId);
        const shopFromDB = await getShopFromObjectID(result.insertedId);
        // console.log("1 shopFromDB is", shopFromDB);
        const activationToken = await generateActivationToken(shopFromDB);
        // console.log("2 activationToken is", activationToken);
        const saveTokenResult = await saveActivationTokenInDB({
          shopId: shopFromDB._id,
          type: "activation",
          createdAt: Date.now(),
          token: activationToken,
          isExpired: false,
        });
        // console.log("3 saveToken result is", saveTokenResult);
        await mailActivationLink(shopFromDB, activationToken);

        response.send({
          message:
            "shop User Created, use the Activation link Sent on mail for Activation",
        });
      } else {
        response.status(500).send({ message: "Unable to Create shop" });
      }
    } else {
      response.status(400).send({ message: "Invalid Signup Data" });
    }
  }
});

router.post("/activate", async function (request, response) {
  const activationTokenFromFront = request.headers.activationtoken;
  const tokenedShopFromDB = await getShopFromActivationToken(
    activationTokenFromFront
  );
  // console.log("activationshopfromDB", tokenedShopFromDB);
  const tokenedShop = await getShopFromObjectID(tokenedShopFromDB.shopId);
  if (tokenedShop) {
    if (!tokenedShop.isActivated) {
      await activateShopInDB(tokenedShop._id);
      response.send({
        message: "shop Activation Success",
      });
    } else {
      response.status(401).send({
        message: "Already Activated shop",
      });
    }
  } else {
    response.status(400).send({ message: "Unauthorised usage" });
  }
});

router.post("/login", async function (request, response) {
  const loginData = request.body;
  // console.log("loginData", loginData);
  const shopFromDB = await getShopFromDBByEmail(loginData.email);
  if (shopFromDB) {
    if (shopFromDB.isActivated === true) {
      const isPasswordMatch = await bcrypt.compare(
        loginData.password,
        shopFromDB.password
      );
      if (isPasswordMatch) {
        const loginToken = jwt.sign(
          { id: shopFromDB._id, time: Date.now() },
          process.env.SECRET_KEY
        );
        await saveLoginToken(shopFromDB, loginToken);
        response.status(200).send({
          message: shopFromDB.isOperator
            ? "operator Login Successfull"
            : "shop Login Successfull",
          token: loginToken,
          isOperator: shopFromDB.isOperator === true ? true : false,
        });
      } else {
        response.status(401).send({ message: "Invalid Credentials" });
      }
    } else {
      const { token: activationToken } =
        await getShopActivationTokenFromObjectID(shopFromDB._id);
      // await mailActivationLink(shopFromDB, activationToken).catch(
      //   console.error
      // );
      response.status(300).send({
        message:
          "Inactive shop, Kindly activate your account by verifying the link sent to mail ",
      });
    }
  } else {
    response.status(400).send({ message: "Invalid Credentials " });
  }
});

async function generateResetToken(shopFromDB) {
  const token = jwt.sign(
    { shopFromDB, date: Date.now() },
    process.env.SECRET_ACTIVATION_KEY
  );
  // console.log("generated reset token is", token);
  return token;
}

async function mailResetLink(shopResetInfo) {
  const url = `${process.env.CLIENT_URL}/change-password/${shopResetInfo.resetToken}`;
  const subject = "Password Reset for Task Manager App";
  const textContent = `Hi ${shopResetInfo.managerName}, as you have requested to reset Password, use this  link to reset. ${url}`;
  const htmlContent = `<div > <p>Hi ${shopResetInfo.managerName} as you have requested to reset Password, this is the link please click and reset.  ${url} </p> <b>forgot? click this link <a href=${url} target="_blank">Reset Password</a> to reset</b> </div>`;
  const receivers = [];
  receivers.push(shopResetInfo.email);
  const sender = {
    name: "Task Manager App",
    mailId: process.env.EMAIL,
  };
  const mailerData = { subject, textContent, htmlContent, receivers, sender };
  await sendMail(mailerData);
}
router.post("/sendResetLink", async function (request, response) {
  const data = request.body;
  // console.log(data);
  const shopFromDB = await getShopFromDBByEmail(data.email);
  if (shopFromDB) {
    const resetToken = await generateResetToken(shopFromDB);

    await saveResetTokenInDB(shopFromDB, resetToken);

    const shopResetInfo = { ...shopFromDB, resetToken: resetToken };
    // console.log("shop reset info", shopResetInfo);
    await mailResetLink(shopResetInfo).catch(console.error);
    response.status(200).send({
      message: "Click on Reset Password link has been sent to your email",
    });
  } else {
    response
      .status(400)
      .send({ message: "Invalid Credentials. try registration first" });
  }
});

router.get("/getInfoFromResetToken", async function (request, response) {
  const { resettoken } = request.headers;
  // console.log("reset token is", resettoken);
  const tokenedShop = await getShopIdFromResetToken(resettoken);
  if (tokenedShop) {
    const shop = await getShopFromObjectID(tokenedShop.shopId);
    // console.log("shop is", shop);
    response.send({
      message: "shop details fetched",
      payload: { managerName: shop.managerName, email: shop.email },
    });
  } else {
    response.status(400).send({ message: "Unauthorised Usage" });
  }
});
router.post("/change-password", async function (request, response) {
  const { resettoken } = request.headers;
  const data = request.body;
  // console.log(data);
  const tokenedShop = await getShopIdFromResetToken(resettoken);
  const shopFromDB = await getShopFromObjectID(tokenedShop.shopId);
  // console.log("shopsssss", shopFromDB);
  if (data.email === shopFromDB.email) {
    if (data.password === data.cpassword) {
      const newPassword = await generateHashedPassword(data.password);
      const result = await updatePasswordInDB(data.email, newPassword);
      await makeResetTokenExpire(resettoken);
      // console.log("password change result", result);
      if (result.modifiedCount === 1) {
        response.send({ message: "Password Change Success" });
      } else {
        response.status(500).send({ message: "Unable to Update Password" });
      }
    } else {
      response.status(300).send({ message: "Passwords not matched" });
    }
  } else {
    response.status(400).send({ message: "Unauthorised Usage" });
  }
});
router.get("/getShopNameImage", async function (request, response) {
  const { logintoken } = request.headers;
  // console.log("login token is", request.headers);
  const tokenedShop = await getShopIdFromLoginToken(logintoken);
  if (tokenedShop) {
    const shop = await getShopProfileFromId(tokenedShop.shopId);
    // console.log("shop is", shop);
    response.send({
      message: "shop details fetched",
      payload: {
        ...shop,
        image:
          "https://e7.pngegg.com/pngimages/893/42/png-clipart-investment-money-shop-bank-investor-bank-saving-investment-thumbnail.png",
      },
    });
  } else {
    response.status(400).send({ message: "Unauthorised Usage" });
  }
});

router.post("/makeLoginTokenExpire", async function (request, response) {
  const { logintoken } = request.headers;

  const result = await makeLoginTokenExpire(logintoken);
  result.modifiedCount > 0
    ? response.send({ message: "token expired" })
    : response.status(500).send({ message: "error token not expired" });
});

router.get("/profile", async function (request, response) {
  const { logintoken } = request.headers;
  const tokenedShop = await getShopIdFromLoginToken(logintoken);
  if (tokenedShop) {
    const shop = await getShopFromObjectID(tokenedShop.shopId);
    // console.log("profile login shop is", shop);
    const profile = await getShopProfileFromId(shop._id);

    // console.log("profile", profile);
    response.send({
      message: "shop profile fetched",
      payload: profile,
    });
  } else {
    response.status(400).send({ message: "Unauthorised Usage" });
  }
});

router.put("/updateShopProfile", async function (request, response) {
  const { logintoken } = request.headers;
  const data = request.body;
  const tokenedShop = await getShopIdFromLoginToken(logintoken);
  if (tokenedShop) {
    const shop = await getShopFromObjectID(tokenedShop.shopId);
    if (shop.email === data.email) {
      // console.log("profile login shop is", shop);
      if (data.password === data.cpassword) {
        const hashedPassword = await generateHashedPassword(data.password);
        const { password, cpassword, ...dataWOP } = data;
        const res = await updateShopDetails(shop._id, {
          ...dataWOP,
          password: hashedPassword,
        });
        // console.log("update profile res is", res);
        if (res.modifiedCount > 0) {
          response.send({
            message: "shop Updated, use the New credentials for login",
          });
        } else {
          response.status(500).send({ message: "Can't update shop Details" });
        }
      } else {
        response.status(400).send({ message: "Passwords not matched" });
      }
    } else {
      response.status(400).send({ message: "Wrong shop" });
    }
  } else {
    response.status(400).send({ message: "Unauthorised Usage" });
  }
});

export default router;

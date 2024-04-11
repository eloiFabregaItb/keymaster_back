import express from "express";

import { db_getUserByUsername, db_updateUserPassword } from "../../../db/db_users.js";
import { tryCatch } from "../../../middleware/tryCatch.js";
import { obfuscateEmail } from "../../../utils/obfuscate.js";
import CodeVerificationList from "../../../logic/CodeVerificationList.js";
import { CustomError, ERROR } from "../../../utils/requestManager.js";
import { validatePassword } from "../../../utils/validations.js";
import { hashPassword } from "../../../utils/crypto.js";

const router = express.Router();
export default router;



const codeWaiting = new CodeVerificationList()



// forgotten
router.post("/forgotten", tryCatch(async (req, res) => {
  //comprueba que se han recibido todos los datos requeridos
  const {login} = req.requireBodyData(["login"]) //login puede ser username o correo

  console.log("FORGOTTEN",login);

  const user = await db_getUserByUsername(login);

  //si no hay resultados
  if (!user) {
    throw new CustomError(ERROR.NOT_FOUND, "User not found")
  }

  const emailObfuscated = obfuscateEmail(user.email)
  const {code} = codeWaiting.push(user)

  console.log("TODO, SEND EMAIL TO",user.email,"with code", code )

  //retornar un success
  return res.send({email: emailObfuscated})
}));


router.post("/checkforgoten", tryCatch(async (req,res)=>{

  const {login,code} = req.requireBodyData(["login","code"])

  const user = await db_getUserByUsername(login);

  if (!user) {
    throw new CustomError(ERROR.NOT_FOUND, "User not found")
  }

  const keyCode = codeWaiting.check(code,user)
  
  if(keyCode){
    return "true"
  }

  throw new CustomError(ERROR.UNEXISTENT, "no code matching")
}))


router.post("/changepassword",tryCatch(async(req,res)=>{
  const {login,code,password} = req.requireBodyData(["login","code","password"])

  const user = await db_getUserByUsername(login);

  if (!user) {
    throw new CustomError(ERROR.NOT_FOUND, "User not found")
  }

  const keyCode = codeWaiting.check(code,user)
  
  if(!keyCode){
    throw new CustomError(ERROR.UNEXISTENT, "no code matching")
  }

  const {valid,errors} = validatePassword(password)

  if(!valid){
    throw new CustomError(ERROR.PASSWORD_FORMAT,errors)
  }

  const pswdHash = hashPassword(password);

  console.log(keyCode,login,password,pswdHash)

  await db_updateUserPassword(user,pswdHash)

}))




import express from 'express';
import {getUserPreferenceById} from "../controller/userController.js";

const userRouter = express.Router();

userRouter.get('/users/:userId/preferences', getUserPreferenceById);

export default userRouter;
import express from 'express';
import {getMaterialById} from "../controller/materialController.js";

const materialRouter = express.Router();

materialRouter.get('/tutorials/:tutorialId', getMaterialById);

export default materialRouter;
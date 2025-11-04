import express from 'express';
import {getMaterialById} from "../controller/materialController.js";

const router = express.Router();

router.get('/tutorials/:tutorialId', getMaterialById);

export default router;
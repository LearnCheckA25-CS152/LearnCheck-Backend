import express from "express";
import {generateQuestion} from "../controller/questionController.js";

const router = express.Router();

router.post('/generate-question/tutorials/:tutorialId', generateQuestion);

export default router;
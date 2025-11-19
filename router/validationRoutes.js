import express from 'express';
import { validateAnswers, getQuizData } from '../controller/validationController.js';

const validationRouter = express.Router();

validationRouter.post('/quiz/validate', validateAnswers);
// validationRouter.get('/quiz/:quizId', getQuizData);

export default validationRouter;
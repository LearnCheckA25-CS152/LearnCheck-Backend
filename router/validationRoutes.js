import express from 'express';
import { 
  validateAnswers,
  // storeResult,
  // updateProgress,
  // getProgress
} from '../controller/validationController.js';

const validationRouter = express.Router();

validationRouter.post('/quiz/validate', validateAnswers);
// validationRouter.get('/quiz/:quizId', getQuizData);
// validationRouter.post('/quiz/score', storeResult);
// validationRouter.post('/pogress', updateProgress);
// validationRouter.get('/progress/:learningId', getProgress);


export default validationRouter;
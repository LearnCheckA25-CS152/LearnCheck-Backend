import express from 'express';
import { validateAnswers} from '../controller/validationController.js';

const validationRouter = express.Router();

validationRouter.post('/quiz/validate', validateAnswers);

export default validationRouter;
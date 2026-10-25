import express from 'express';
import {
  runEvaluation,
  getComplianceRules,
  seedDefaultRules,
} from '../controllers/ruleController.js';

const router = express.Router();

router.get('/', getComplianceRules);
router.post('/seed', seedDefaultRules);
router.post('/evaluate/:id', runEvaluation);

export default router;

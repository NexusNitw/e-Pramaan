import express from 'express';
import {
  orchestrateScrutiny,
  getAuditHistory,
} from '../controllers/scrutinyController.js';

const router = express.Router();

router.post('/orchestrate/:id', orchestrateScrutiny);
router.get('/audit/:id', getAuditHistory);

export default router;

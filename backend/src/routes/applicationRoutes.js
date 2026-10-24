import express from 'express';
import {
  createApplication,
  getApplications,
  getApplicationById,
  addOfficerRemark,
} from '../controllers/applicationController.js';

const router = express.Router();

router.route('/')
  .get(getApplications)
  .post(createApplication);

router.route('/:id')
  .get(getApplicationById);

router.route('/:id/remarks')
  .post(addOfficerRemark);

export default router;

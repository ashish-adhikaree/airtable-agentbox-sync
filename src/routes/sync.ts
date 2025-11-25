import SyncController from '@/controllers/sync';
import { validateId } from '@/validators';
import { Router } from 'express';

const SyncnRouter: Router = Router();

SyncnRouter.get('/appraisal/:id', validateId(), SyncController.syncAppraisal);

export default SyncnRouter;

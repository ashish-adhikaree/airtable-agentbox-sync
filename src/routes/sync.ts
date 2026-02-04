import SyncController from '@/controllers/sync';
import { validateId } from '@/validators';
import { Router } from 'express';

const SyncnRouter: Router = Router();

SyncnRouter.get('/appraisal/:id', validateId(), SyncController.syncAppraisal);
SyncnRouter.get('/listing-documents/:listingId', validateId('listingId'), SyncController.syncListingDocuments);

export default SyncnRouter;

import SyncService from '@/services/sync';
import { NextFunction, Request, Response } from 'express';

async function syncAppraisal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = await SyncService.syncAppraisal(id!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}



async function syncListingDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { listingId } = req.params;
    const data = await SyncService.syncListingDocuments(listingId!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

const SyncController = {
  syncAppraisal,
	syncListingDocuments,
};

export default SyncController;

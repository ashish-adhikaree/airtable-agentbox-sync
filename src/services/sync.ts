import logger from '@/lib/utils/logger';
import AirtableService from './airtable';
import SyncRecordsHelper from '@/lib/helpers/sync-records';
import { SYNC_RECORD_STATUS } from '@/lib/constants';

async function syncAppraisal(id: string) {
  const log = logger({ service: 'SyncService', method: 'syncAppraisal', meta: { id } });
  log.info(`Syncing appraisal with ID ${id}`);
  try {
    await SyncRecordsHelper.addSyncRecord({ tableName: 'Appraisal', recordId: id });
    const record = await AirtableService.getAirtableRecord('Appraisal', id);
		
    // await SyncRecordsHelper.updateSyncRecordStatus({ recordId: id, status: SYNC_RECORD_STATUS.COMPLETED });
    return record;
  } catch (err: any) {
    await SyncRecordsHelper.updateSyncRecordStatus({ recordId: id, status: SYNC_RECORD_STATUS.FAILED });
    err.location = { service: 'SyncService', method: 'syncAppraisal' };
    err.meta = { id };
    throw err;
  }
}

const SyncService = {
  syncAppraisal,
};

export default SyncService;

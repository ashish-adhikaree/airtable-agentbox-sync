import logger from '@/lib/utils/logger';
import AirtableService from './airtable';
import SyncRecordsHelper from '@/lib/helpers/sync-records';
import { SYNC_RECORD_STATUS } from '@/lib/constants';
import { airtableToAgentboxAppraisal } from '@/lib/helpers/mappers/airtableToAgentboxAppraisal';
import agentboxClient from '@/lib/utils/agentbox-client';

async function syncAppraisal(id: string) {
  const log = logger({ service: 'SyncService', method: 'syncAppraisal', meta: { id } });
  log.info(`Syncing appraisal with ID ${id}`);
  try {
    const existingRecord = await SyncRecordsHelper.getSyncRecordById(id);
    if (existingRecord) {
      if (existingRecord.status === SYNC_RECORD_STATUS.COMPLETED) {
        log.info(`Appraisal with ID ${id} has already been synced successfully. Skipping.`);
        return;
      }
      if (existingRecord.status === SYNC_RECORD_STATUS.IN_PROGRESS) {
        log.info(`Appraisal with ID ${id} is already in progress. Skipping.`);
        return;
      }
    } else {
      await SyncRecordsHelper.addSyncRecord({ tableName: 'Appraisal', recordId: id });
    }

    const record = await AirtableService.getAirtableRecord('Appraisal', id);

    const mappedAppraisal = await airtableToAgentboxAppraisal(record._rawJson);

    console.log(mappedAppraisal.appraisal.property.address, 'mappedAppraisal');
    const { data } = await agentboxClient.post('/appraisals', mappedAppraisal);
    await SyncRecordsHelper.updateSyncRecordStatus({ recordId: id, status: SYNC_RECORD_STATUS.COMPLETED });

    return {
      appraisalId: data.response.appraisal.id,
      status: 'synced',
    };
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

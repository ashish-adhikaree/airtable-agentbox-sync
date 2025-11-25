import db from '@/db';
import { syncRecords } from '@/db/schema';
import { backOff } from 'exponential-backoff';
import logger from '@/lib/utils/logger';
import { SYNC_RECORD_STATUS } from '../constants';
import { eq } from 'drizzle-orm'

async function addSyncRecord(record: { tableName: string; recordId: string; status?: string }) {
  const log = logger({ service: 'SyncRecordsHelper', method: 'addSyncRecord', meta: { record } });
  log.info(`Adding sync record for table ${record.tableName} with ID ${record.recordId}`);
  try {
    const response = await backOff(async () => {
      return await db.insert(syncRecords).values({
        tableName: record.tableName,
        recordId: record.recordId,
        status: record.status || SYNC_RECORD_STATUS.IN_PROGRESS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    return response;
  } catch (err: any) {
    err.location = { service: 'SyncRecordsHelper', method: 'addSyncRecord' };
    err.meta = { record };
    throw err;
  }
}

async function updateSyncRecordStatus({recordId, status}:{recordId: string, status: string}) {
  const log = logger({ service: 'SyncRecordsHelper', method: 'updateSyncRecordStatus', meta: { recordId, status } });
  log.info(`Updating sync record ID ${recordId} to status ${status}`);
  try {
    const response = await backOff(async () => {
      return await db
        .update(syncRecords)
        .set({
          status: status,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(syncRecords.recordId, recordId));
    });
    return response;
  } catch (err: any) {
    err.location = { service: 'SyncRecordsHelper', method: 'updateSyncRecordStatus' };
    err.meta = { recordId, status };
    throw err;
  }
}

const SyncRecordsHelper = {
  addSyncRecord,
  updateSyncRecordStatus,
};

export default SyncRecordsHelper;

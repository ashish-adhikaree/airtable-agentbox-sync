import env from '@/config/env';
import {  BASE_ID } from '@/lib/constants';
import logger from '@/lib/utils/logger';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(BASE_ID);

async function getAirtableRecord(tableName: string, recordId: string) {
  const log = logger({ service: 'AirtableService', method: 'getAirtableRecord', meta: { tableName, recordId } });
  log.info(`Fetching record from Airtable table ${tableName} with ID ${recordId}`);
  try {
    const record = await base(tableName).find(recordId);
    return record;
  } catch (err: any) {
    err.location = { service: 'AirtableService', method: 'getAirtableRecord' };
    err.meta = { tableName, recordId };
    throw err;
  }
}

const AirtableService = {
  getAirtableRecord,
};

export default AirtableService;

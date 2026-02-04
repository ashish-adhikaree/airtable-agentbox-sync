import logger from '@/lib/utils/logger';
import AirtableService from './airtable';
import SyncRecordsHelper from '@/lib/helpers/sync-records';
import { SYNC_RECORD_STATUS } from '@/lib/constants';
import {
  airtableToAgentboxAppraisal,
  attachDocumentToAppraisal,
} from '@/lib/helpers/mappers/airtableToAgentboxAppraisal';
import agentboxClient from '@/lib/utils/agentbox-client';
import { file } from 'zod';

async function syncAppraisal(id: string) {
  const log = logger({ service: 'SyncService', method: 'syncAppraisal', meta: { id } });
  log.info(`Syncing appraisal with ID ${id}`);
  try {
    const existingRecord = await SyncRecordsHelper.getSyncRecordById(id);
    if (existingRecord) {
      if (existingRecord.status === SYNC_RECORD_STATUS.COMPLETED) {
        log.info(`Appraisal with ID ${id} has already been synced successfully. Skipping.`);
        return {
          message: 'Appraisal already synced',
        };
      }
      if (existingRecord.status === SYNC_RECORD_STATUS.IN_PROGRESS) {
        log.info(`Appraisal with ID ${id} is already in progress. Skipping.`);
        return {
          message: 'Appraisal sync in progress',
        };
      }
    } else {
      await SyncRecordsHelper.addSyncRecord({ tableName: 'Appraisal', recordId: id });
    }

    const record = await AirtableService.getAirtableRecord('Appraisal', id);

    const mappedAppraisal = await airtableToAgentboxAppraisal(record._rawJson);

    const { data } = await agentboxClient.post('/appraisals', mappedAppraisal);
    await SyncRecordsHelper.updateSyncRecordStatus({
      recordId: id,
      status: SYNC_RECORD_STATUS.COMPLETED,
      agentboxListingId: data.response.appraisal.id,
    });

    if (
      record.fields['Please attach your CMA report'] &&
      Array.isArray(record.fields['Please attach your CMA report'])
    ) {
      for (const file of record.fields['Please attach your CMA report']) {
        await attachDocumentToAppraisal(
          data.response.appraisal.id,
          file.url,
          file.filename ?? 'CMA Report',
          log,
          'General Docs'
        );
      }
    }

    return {
      appraisalId: data.response.appraisal.id,
      status: 'synced',
    };
  } catch (err: any) {
    let errorMessage = err.message || 'Unknown error';
    const errors = err.response?.data?.response?.errors;
    if (errors && Array.isArray(errors)) {
      errorMessage = errors.map((e: any) => e.detail).join('\n');
    }
    await SyncRecordsHelper.updateSyncRecordStatus({ recordId: id, status: SYNC_RECORD_STATUS.FAILED, errorMessage });
    err.location = { service: 'SyncService', method: 'syncAppraisal' };
    err.meta = { id };
    throw err;
  }
}

async function syncListingDocuments(listingId: string) {
  const log = logger({ service: 'SyncService', method: 'syncListingDocuments', meta: { listingId } });
  log.info(`Syncing listing documents for Listing ID ${listingId}`);
  try {
    const record = await AirtableService.getAirtableRecord('Listing', listingId);

    log.info(`Fetched Airtable record for Listing ID ${listingId}`);

    const linkedAppraisalId = (record.fields['Linked Appraisal'] as any)?.[0];
    log.info(`Linked Appraisal ID for Listing ID ${listingId}: ${linkedAppraisalId}`);
    if (!linkedAppraisalId) {
      throw new Error('Linked Appraisal ID is missing in the Airtable record');
    }

    log.info(`Searching Agentbox listings for Linked Appraisal ID: ${linkedAppraisalId}`);
    const agentboxListings = await agentboxClient.get(`/listings`, {
      params: {
        'filter[query]': linkedAppraisalId,
        limit: 1,
      },
    });

    const matchedAgentBoxListing = agentboxListings.data.response?.listings?.[0];

    if (!matchedAgentBoxListing) {
      throw new Error(`No matching Agentbox listing found for Linked Appraisal ID: ${linkedAppraisalId}`);
    }

    if (matchedAgentBoxListing.externalId !== linkedAppraisalId) {
      throw new Error(`Mismatch between Linked Appraisal ID and Agentbox listing external ID`);
    }

    const agentboxListingId = matchedAgentBoxListing.id;

    log.info(`Matched Agentbox listing for Linked Appraisal ID ${linkedAppraisalId}: ${agentboxListingId}`);

    const agencyAgreement = record.fields['Agency Agreement'];
    const cmaDocuments = record.fields['CMA'];
    const authorisingDocument = record.fields['Authorising Document'];

    await Promise.all(
      [
        { key: 'Agency Agreement', fallbackTitle: 'Agency Agreement', files: agencyAgreement },
        { key: 'General Docs', fallbackTitle: 'CMA Document', files: cmaDocuments },
        { key: 'General Docs', fallbackTitle: 'Authorising Document', files: authorisingDocument },
      ].map(async ({ key, fallbackTitle, files }) => {
        if (files && Array.isArray(files)) {
          for (const file of files) {
            await attachDocumentToAppraisal(
              agentboxListingId,
              file.url,
              file.filename ? fallbackTitle + '__' + file.filename : fallbackTitle,
              log,
              key
            );
          }
        }
      })
    );

    return { status: 'synced', listingId: agentboxListingId };
  } catch (err: any) {
    err.location = { service: 'SyncService', method: 'syncListingDocuments' };
    err.meta = { listingId };
    throw err;
  }
}

const SyncService = {
  syncAppraisal,
  syncListingDocuments,
};

export default SyncService;

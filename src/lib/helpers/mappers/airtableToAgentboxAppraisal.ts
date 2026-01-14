import { format } from 'date-fns/format';
import getCachedData from '../get-cached-data';
import agentboxClient from '@/lib/utils/agentbox-client';
import logger from '@/lib/utils/logger';
import { AIRTABLE_TABLE_IDS, BASE_ID } from '@/lib/constants';

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: {
    Id: number;
    'Street Address': string;
    Suburb: string;
    Office: string;
    'Property Type': string;
    Mobile?: string;
    'First Name': string;
    Email: string;
    'Last Name': string;
    'First Name - 2nd Vendor'?: string;
    'Vendor 2 Last Name'?: string;
    'Vendor 2 Mobile number'?: string;
    'Vendor 2 Email Address'?: string;
    Bed: string;
    Bath: string;
    Car: string;
    'Land Size': string;
    'Are there additional vendors?': 'No';
    State: string;
    'Appraisal Source': string;
    'Street No.': number;
    'Level No.'?: number;
    'Unit No.'?: number;
    Type: string;
    'For Sale/Rental': 'Sale' | 'Lease';
    'Email (from Lead Agent)'?: string[];
    'Email (from 2nd Agent)'?: string[];
    Postcode: string;
    'Price From ($)'?: number;
    'Price To ($)'?: number;
    'Please attach your CMA report'?: {
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
      thumbnails: {
        small: {
          url: string;
          width: number;
          height: number;
        };
        large: {
          url: string;
          width: number;
          height: number;
        };
      };
    }[];
  };
};

export async function attachDocumentToAppraisal(appraisalId: string, documentUrl: string, log: ReturnType<typeof logger>) {
  try {
    log.info(`Attaching document to appraisal ID ${appraisalId} from URL ${documentUrl}`);
    await agentboxClient.post(`/listing-documents`, {
      sourceUrl: documentUrl,
      attachedListing: {
        id: appraisalId,
      },
      type: 'General Docs',
    });
    return true;
  } catch (error) {
    log.error(`Failed to attach document to appraisal ID ${appraisalId}: ${error}`);
    return false;
  }
}

async function createVendor({
  email,
  firstName,
  lastName,
  mobile,
  log,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  log: ReturnType<typeof logger>;
}) {
  if (!firstName || !lastName) {
    log.warn('Insufficient data to create Vendor in AgentBox, missing first or last name');
    return null;
  }

  mobile = mobile ? mobile.replace(/\D/g, '') : undefined;

  if (mobile && mobile.length < 10) {
    log.warn('Mobile number is too short, skipping mobile field');
    mobile = undefined;
  }

  const newVendor = await agentboxClient.post('/contacts', {
    contact: {
      firstName,
      lastName,
      email: email,
      ...(mobile ? { mobile } : {}),
      type: 'Person',
    },
  });

  return newVendor.data.response.contact.id;
}

export async function airtableToAgentboxAppraisal(record: AirtableRecord) {
  const log = logger({
    service: 'AirtableToAgentboxAppraisal',
    method: 'airtableToAgentboxAppraisal',
    meta: { recordId: record.id },
  });
  log.info(`Mapping Airtable record ID ${record.id} to Agentbox appraisal format`);
  try {
    const fields = record.fields;

    log.info('Fetching AgentBox offices from cache or API');
    const agentBoxOffices = await getCachedData('ab-offices', async () => {
      const { data } = await agentboxClient.get('/offices', {
        params: {
          limit: 100,
        },
      });
      return data.response.offices;
    });

    const officeId =
      agentBoxOffices.find((office: any) => office.name === fields.Office)?.id ?? agentBoxOffices?.[0]?.id;

    log.info(`Determined office ID: ${officeId} for office name: ${fields.Office}`);

    const agents = (fields['Email (from Lead Agent)'] ?? []).concat(fields['Email (from 2nd Agent)'] ?? []);

    log.info('Fetching AgentBox agents from cache or API');
    const agentBoxAgents =
      agents.length === 0
        ? []
        : await getCachedData('ab-agents', async () => {
            const { data } = await agentboxClient.get('/staff', {
              params: {
                limit: 100,
              },
            });
            return data.response.staffMembers;
          });

    log.info('Filtering agentbox agents based on emails from Airtable record');
    const filteredAgents = agentBoxAgents.filter((agent: any) => agents.includes(agent.email));

    let vendor1 = null;
    let vendor2 = null;

    if (fields['Email']) {
      log.info('Fetching vendor 1 from AgentBox');
      const vendor1InAb = (
        await agentboxClient.get('/contacts', {
          params: {
            limit: 1,
            'filter[email]': fields['Email'],
          },
        })
      )?.data?.response?.contacts?.[0];
      if (vendor1InAb?.id) {
        vendor1 = vendor1InAb.id;
      } else {
        log.info(`Vendor with email ${fields['Email']} not found in AgentBox`);
        log.info('Creating new contact for vendor 1 in AgentBox');

        vendor1 = await createVendor({
          email: fields['Email'],
          firstName: fields['First Name'],
          lastName: fields['Last Name'],
          mobile: fields['Mobile'],
          log,
        });

        if (vendor1) {
          log.info(`Created new vendor 1 in AgentBox with ID ${vendor1}`);
        }
      }
    }

    if (fields['Vendor 2 Email Address']) {
      log.info('Fetching vendor 2 from AgentBox');
      const vendor2InAb = (
        await agentboxClient.get('/contacts', {
          params: {
            limit: 1,
            'filter[email]': fields['Vendor 2 Email Address'],
          },
        })
      )?.data?.response?.contacts?.[0];

      if (vendor2InAb?.id) {
        vendor2 = vendor2InAb.id;
      } else {
        log.info(`Vendor 2 with email ${fields['Vendor 2 Email Address']} not found in AgentBox`);
        log.info('Creating new contact for vendor 2 in AgentBox');

        vendor2 = await createVendor({
          email: fields['Vendor 2 Email Address'],
          firstName: fields['First Name - 2nd Vendor'],
          lastName: fields['Vendor 2 Last Name'],
          mobile: fields['Vendor 2 Mobile number'],
          log,
        });

        if (vendor2) {
          log.info(`Created new vendor 2 in AgentBox with ID ${vendor2}`);
        }
      }
    }

    const appraisal = {
      appraisal: {
        appraisalDate: format(new Date(record.createdTime), 'yyyy/MM/dd'),
        source: fields['Appraisal Source'],
        externalId: record.id,
        type: fields['For Sale/Rental'] === 'Sale' ? 'sale' : 'lease',
        ...(fields['Price From ($)'] || fields['Price To ($)']
          ? {
              salePrice: {
                rangeFrom: fields['Price From ($)'],
                rangeTo: fields['Price To ($)'],
              },
            }
          : {}),
        property: {
          category: fields['Property Type'],
          type: fields.Type,
          address: {
            suburb: fields.Suburb,
            state: fields.State,
            country: 'Australia',
            streetName: fields['Street Address'],
            postcode: fields['Postcode'],
            ...(fields['Level No.'] ? { levelNum: fields['Level No.'] } : {}),
            ...(fields['Unit No.'] ? { unitNum: fields['Unit No.'] } : {}),
            ...(fields['Street No.'] ? { streetNum: fields['Street No.'] } : {}),
          },
          bedrooms: parseInt(fields.Bed, 10),
          bathrooms: parseInt(fields.Bath, 10),
          carSpaces: parseInt(fields.Car, 10),
          landArea: {
            value: parseInt(fields['Land Size'], 10),
            unit: 'sqm',
          },
        },
        externalLinks: [
          {
            type: 'General External Link',
            title: 'Airtable Record',
            url: `https://airtable.com/${BASE_ID}/${AIRTABLE_TABLE_IDS.APPRAISALS}/${record.id}`,
            order: 1,
          },
        ],
        ...(officeId ? { officeId } : {}),
        ...(filteredAgents.length > 0
          ? {
              attachedRelatedStaffMembers: filteredAgents.map((agent: any, index: number) => ({
                webDisplay: true,
                displayOrder: index + 1,
                role: 'Appraisal Agent',
                staffMember: {
                  id: agent.id,
                },
              })),
            }
          : {}),
        attachedRelatedContacts: [
          ...(vendor1
            ? [
                {
                  role: 'Vendor',
                  contact: {
                    id: vendor1,
                  },
                },
              ]
            : []),
          ...(vendor2
            ? [
                {
                  role: 'Vendor',
                  contact: {
                    id: vendor2,
                  },
                },
              ]
            : []),
        ],
      },
    };

    return appraisal;
  } catch (err: any) {
    err.location = { service: 'AirtableToAgentboxAppraisal', method: 'airtableToAgentboxAppraisal' };
    err.meta = { recordId: record.id };
    throw err;
  }
}

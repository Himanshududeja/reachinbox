import elasticsearch from "../config/elasticsearch";

const EMAIL_INDEX = "emails";

export interface EmailSearchParams {
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const connectElasticsearch = async () => {
  const response = await elasticsearch.ping();

  if (!response) {
    throw new Error("Elasticsearch connection failed");
  }

  console.log("Elasticsearch connected");
};

export const createEmailIndex = async () => {
  const exists = await elasticsearch.indices.exists({
    index: EMAIL_INDEX
  });

  if (exists.body) {
    return;
  }

  await elasticsearch.indices.create({
    index: EMAIL_INDEX,
    body: {
      mappings: {
        properties: {
          id: { type: "integer" },
          campaign_id: { type: "integer" },
          sender_id: { type: "integer" },
          recipient: { type: "keyword" },
          subject: { type: "text" },
          body: { type: "text" },
          scheduled_at: { type: "date" },
          sent_at: { type: "date" },
          status: { type: "keyword" }
        }
      }
    }
  });

  console.log("Elasticsearch emails index created");
};

export const indexEmail = async (email: {
  id: number;
  campaign_id: number;
  sender_id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: Date;
  sent_at: Date | null;
  status: string;
}) => {
  await elasticsearch.index({
    index: EMAIL_INDEX,
    id: String(email.id),
    body: email
  });
};

export const searchEmails = async ({
  query,
  status,
  page = 1,
  limit = 20
}: EmailSearchParams) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const from = (safePage - 1) * safeLimit;

  const must: any[] = [];
  const filter: any[] = [];

  if (query?.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: [
          "recipient",
          "subject",
          "body"
        ],
        fuzziness: "AUTO"
      }
    });
  }

  if (status) {
    filter.push({
      term: {
        status
      }
    });
  }

  const response = await elasticsearch.search({
    index: EMAIL_INDEX,
    body: {
      from,
      size: safeLimit,
      query: {
        bool: {
          must,
          filter
        }
      },
      sort: [
        {
          scheduled_at: {
            order: "desc"
          }
        }
      ]
    }
  });

  const hits: any = response.body.hits;

  return {
    results: hits.hits.map((hit: any) => hit._source),
    total: hits.total.value,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(hits.total.value / safeLimit)
  };
};
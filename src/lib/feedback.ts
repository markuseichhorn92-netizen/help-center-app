import { kv } from './kv';

export interface ArticleFeedback {
  articleId: string;
  helpful: number;
  notHelpful: number;
  helpfulPercent: number;
}

export interface FeedbackSummary {
  articleId: string;
  title?: string;
  helpful: number;
  notHelpful: number;
  total: number;
  helpfulPercent: number;
}

// Generate a simple visitor hash based on browser fingerprint
// This is sent from the client and used to prevent duplicate votes
export function generateVisitorHash(userAgent: string, ip: string): string {
  // Simple hash function
  const str = `${userAgent}-${ip}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Check if visitor has already voted
export async function hasVoted(articleId: string, visitorHash: string): Promise<boolean> {
  const hasVoted = await kv.sismember(`article:${articleId}:feedback:voters`, visitorHash);
  return hasVoted === 1;
}

// Submit feedback for an article
export async function submitFeedback(
  articleId: string,
  helpful: boolean,
  visitorHash: string
): Promise<{ success: boolean; alreadyVoted?: boolean }> {
  // Check if already voted
  const alreadyVoted = await hasVoted(articleId, visitorHash);
  if (alreadyVoted) {
    return { success: false, alreadyVoted: true };
  }

  // Record the vote
  if (helpful) {
    await kv.incr(`article:${articleId}:feedback:helpful`);
  } else {
    await kv.incr(`article:${articleId}:feedback:not_helpful`);
  }

  // Mark visitor as having voted
  await kv.sadd(`article:${articleId}:feedback:voters`, visitorHash);

  return { success: true };
}

// Get feedback counts for an article
export async function getArticleFeedback(articleId: string): Promise<ArticleFeedback> {
  const [helpful, notHelpful] = await Promise.all([
    kv.get(`article:${articleId}:feedback:helpful`),
    kv.get(`article:${articleId}:feedback:not_helpful`),
  ]);

  const helpfulCount = (helpful as number) || 0;
  const notHelpfulCount = (notHelpful as number) || 0;
  const total = helpfulCount + notHelpfulCount;

  return {
    articleId,
    helpful: helpfulCount,
    notHelpful: notHelpfulCount,
    helpfulPercent: total > 0 ? Math.round((helpfulCount / total) * 100) : 0,
  };
}

// Get feedback for all articles
export async function getAllArticleFeedback(): Promise<FeedbackSummary[]> {
  // Get all article IDs
  const articleIds = await kv.smembers('articles:ids');

  if (!articleIds || articleIds.length === 0) {
    return [];
  }

  // Get feedback for each article
  const feedbackPromises = articleIds.map(async (id) => {
    const article = await kv.hgetall(`article:${id}`);
    const title = article && typeof article === 'object' && 'title' in article
      ? (article.title as string)
      : undefined;

    const feedback = await getArticleFeedback(id as string);

    return {
      articleId: id as string,
      title,
      helpful: feedback.helpful,
      notHelpful: feedback.notHelpful,
      total: feedback.helpful + feedback.notHelpful,
      helpfulPercent: feedback.helpfulPercent,
    };
  });

  const results = await Promise.all(feedbackPromises);

  // Sort by total votes descending
  return results.sort((a, b) => b.total - a.total);
}

// Get articles with low helpfulness score (for improvement)
export async function getLowRatedArticles(threshold: number = 50): Promise<FeedbackSummary[]> {
  const allFeedback = await getAllArticleFeedback();

  return allFeedback.filter(
    (f) => f.total >= 5 && f.helpfulPercent < threshold
  );
}

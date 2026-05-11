import { store } from '../db/store.js';

export class NewsService {
  list({ clusterId, category } = {}) {
    return store.newsArticles
      .filter((row) => !clusterId || row.clusterId === clusterId)
      .filter((row) => !category || row.category === category)
      .sort((a, b) => new Date(b.publishedAt ?? b.published_at).getTime() - new Date(a.publishedAt ?? a.published_at).getTime());
  }

  clusters() {
    const grouped = new Map();
    for (const article of store.newsArticles) {
      const current = grouped.get(article.clusterId) ?? {
        clusterId: article.clusterId,
        title: article.title,
        articleCount: 0,
        sources: [],
        summaries: []
      };
      current.articleCount += 1;
      current.sources.push(article.source);
      current.summaries.push(article.summary);
      grouped.set(article.clusterId, current);
    }
    return [...grouped.values()];
  }
}

export const newsService = new NewsService();

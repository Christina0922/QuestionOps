/**
 * Inngest wiring stub (Phase Y7).
 * Local MVP still runs comment import / analysis inline after API response.
 * Wire functions here when INNGEST_EVENT_KEY is configured.
 */
export const youtubeJobQueue = {
  mode: process.env.INNGEST_EVENT_KEY ? "inngest" : "inline",
  events: {
    commentImport: "youtube/comment.import",
    analysis: "youtube/analysis.run",
    incrementalSync: "youtube/comment.incremental",
  },
} as const;

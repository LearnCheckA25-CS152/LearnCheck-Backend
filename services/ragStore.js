import NodeCache from "node-cache";
import {load as loadHtml} from "cheerio";

// import { Document } from "@langchain/core/documents";
// import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
// Cache for vector stores to avoid rebuilding

const vsCache = new NodeCache({stdTTL: 3600});

export function htmlToText(html) {
  const $ = loadHtml(html);
  $('script,style,noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

export async function buildRetriever(materialId, contentText, embeddings) {
  const key = `vs:${materialId}`;
  let store = vsCache.get(key);
  if (!store) {
    const chunks = contentText.match(/.{1,900}(\s|$)/g) || [contentText];
    const docs = chunks.map((t, i) =>
      new Document({ pageContent: t, metadata: { materialId, chunk: i } })
    );
    store = await MemoryVectorStore.fromDocuments(docs, embeddings);
    vsCache.set(key, store);
  }
  return store.asRetriever(4);
}
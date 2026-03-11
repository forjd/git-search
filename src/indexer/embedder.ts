import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const BATCH_SIZE = 32;

let extractor: FeatureExtractionPipeline | null = null;

export async function loadModel(): Promise<void> {
  if (extractor) return;
  extractor = await pipeline("feature-extraction", MODEL_NAME, {
    dtype: "fp32",
  });
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (!extractor) {
    await loadModel();
  }

  const results: Float32Array[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await extractor!(batch, {
      pooling: "mean",
      normalize: true,
    });

    // output.data is a flat Float32Array of all embeddings concatenated
    const dim = 384;
    for (let j = 0; j < batch.length; j++) {
      const embedding = new Float32Array(dim);
      embedding.set(output.data.slice(j * dim, (j + 1) * dim) as Float32Array);
      results.push(embedding);
    }
  }

  return results;
}

export async function embedText(text: string): Promise<Float32Array> {
  const [embedding] = await embedTexts([text]);
  return embedding!;
}

export function composeEmbeddingText(
  message: string,
  filePaths: string[],
): string {
  const filesStr = filePaths.join(", ");
  return filesStr ? `${message}\n\nFiles: ${filesStr}` : message;
}

const API_URL =
  process.env.NEXT_PUBLIC_COMPARE_ENDPOINT?.trim() ||
  "/api/compare";

const BULK_API_URL =
  process.env.NEXT_PUBLIC_BULK_COMPARE_ENDPOINT?.trim() ||
  "/api/bulk-compare";

export type CompareCodesPayload = {
  language: "python" | string;
  reference_code: string;
  submission_code: string;
};

export type CodeMetrics = {
  loc?: number;
  cyclomatic?: number;
  max_nesting?: number;
  num_functions?: number;
  [key: string]: number | undefined;
};

export type CompareCodesResponse = {
  ok: boolean;
  plagiarism_score: number;
  risk_level: string;
  semantic_similarity: number;
  ast_similarity: number;
  token_similarity: number;
  explanation?: string;
  submission_quality_score?: number;
  submission_quality_label?: string;
  submission_quality_explanation?: string;
  reference: {
    metrics?: CodeMetrics;
    ast?: unknown;
  };
  submission: {
    metrics?: CodeMetrics;
    ast?: unknown;
  };
  normalized?: {
    reference_code?: string;
    submission_code?: string;
  };
  message?: string;
};

export type BulkSubmissionInput = {
  id: string;
  code: string;
};

export type BulkComparePayload = {
  language: "python" | string;
  reference_code: string;
  submissions: BulkSubmissionInput[];
};

export type BulkCompareResult = {
  id: string;
  ok: boolean;
  plagiarism_score: number;
  risk_level: string;
  semantic_similarity: number;
  ast_similarity: number;
  token_similarity: number;
  explanation: string;
  quality_score: number;
  quality_label: string;
  quality_explanation: string;
  message?: string;
};

export type BulkCompareResponse = {
  ok: boolean;
  results: BulkCompareResult[];
  message?: string;
};

export async function compareCodes(payload: CompareCodesPayload): Promise<CompareCodesResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let data: CompareCodesResponse | undefined;
  try {
    data = (await response.json()) as CompareCodesResponse;
  } catch {
    throw new Error("Unable to parse analysis response");
  }

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Analysis failed");
  }

  return data;
}

export async function bulkCompare(payload: BulkComparePayload): Promise<BulkCompareResponse> {
  if (!payload.submissions?.length) {
    throw new Error("Add at least one submission to compare");
  }

  const response = await fetch(BULK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let data: BulkCompareResponse | undefined;
  try {
    data = (await response.json()) as BulkCompareResponse;
  } catch {
    throw new Error("Unable to parse bulk analysis response");
  }

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Bulk analysis failed");
  }

  return data;
}

export async function checkPlagiarism(codeA: string, codeB: string) {
  // Legacy placeholder – retained for reference components
  await delay();
  const diff = Math.abs(codeA.length - codeB.length);
  const similarityPercent = clamp(95 - diff * 0.05, 10, 98);
  return {
    similarityPercent: Math.round(similarityPercent),
    embeddingSim: clamp(0.65 + (1 - diff / 400) * 0.25, 0, 0.99),
    structureSim: clamp(0.55 + (1 - diff / 300) * 0.3, 0, 0.95),
    matchedLines: [
      { a: 3, b: 5 },
      { a: 14, b: 17 },
    ],
    insights: ["High loop similarity", "Similar function structure"],
  };
}

export async function checkCodeQuality(code: string) {
  // TODO: Integrate backend
  await delay();
  const lengthScore = clamp(100 - code.length * 0.02, 55, 95);
  const issues = [] as string[];
  if (!/\/\//.test(code)) {
    issues.push("Low comment ratio");
  }
  if (code.split(/function|=>/).length > 3) {
    issues.push("Consider splitting into modules");
  }
  if (code.length > 240) {
    issues.push("Function too long");
  }
  if (issues.length === 0) {
    issues.push("Looks solid – add tests for certainty");
  }
  return {
    qualityScore: Math.round(lengthScore),
    issues,
  };
}

export async function generateAST(code: string) {
  // TODO: AST API integration
  await delay();
  const lines = code
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    nodes: [
      {
        type: "FunctionDeclaration",
        children: lines.map((line, index) => ({
          type: index === 0 ? "Identifier" : "Statement",
          value: line.slice(0, 40),
        })),
      },
    ],
  };
}

async function delay(duration = 600) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

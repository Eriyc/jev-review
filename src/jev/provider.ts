export type JevProvider = "typesafe" | "openrouter";

export type JevProviderConfig = {
  provider: JevProvider;
  apiKey: string;
  model?: string;
};

export const JEV_API_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";
export const OPENROUTER_API_ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
export const OPENROUTER_MODEL = "~typesafe/jev-latest";

export function providerEndpoint(config: JevProviderConfig): string {
  return config.provider === "openrouter" ? OPENROUTER_API_ENDPOINT : JEV_API_ENDPOINT;
}

export function providerModel(config: JevProviderConfig): string {
  return config.model?.trim() || (config.provider === "openrouter" ? OPENROUTER_MODEL : JEV_MODEL);
}

export function providerKeyName(config: JevProviderConfig): string {
  return config.provider === "openrouter" ? "OPENROUTER_API_KEY" : "JEV_API_KEY";
}

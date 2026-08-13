export interface PublicBuildEnvironment {
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?: string;
}

export interface DeploymentBuildEnvironment {
  VERCEL_GIT_COMMIT_SHA?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}

export const PUBLIC_BUILD_KEYS = Object.freeze([
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
] as const);

export const DEPLOYMENT_BUILD_KEYS = Object.freeze([
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const);

/** Literal references are intentional: Next.js only inlines public variables it can see statically. */
export function publicBuildEnvironment(
  source?: PublicBuildEnvironment,
): PublicBuildEnvironment {
  return source || {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  };
}

export function deploymentBuildEnvironment(
  source?: DeploymentBuildEnvironment,
): DeploymentBuildEnvironment {
  return source || {
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };
}

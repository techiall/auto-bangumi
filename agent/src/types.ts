export interface AgentConfig {
  apiTimeoutMs: number;
  downloadServerUrl: string;
  jobAttempts: number;
  jobLimit: number;
  libraryDisplayRoot: string;
  libraryRoot: string;
  pollIntervalMs: number;
  serverCredentials: ServerCredentials;
  transferTimeoutMs: number;
}

export interface ServerCredentials {
  username: string;
  password: string;
}

export interface MoverJob {
  id: string;
  sourceUrl: string;
  sourceHeaders?: Record<string, string>;
  targetRelativePath: string;
  title: string;
  season: number;
  episode: number;
}

export interface ClaimedJobs {
  jobs: MoverJob[];
}

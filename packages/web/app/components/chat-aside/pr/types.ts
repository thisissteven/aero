// app/components/chat-aside/pr/types.ts
//
// Server response shapes for the GitHub routes, mirroring
// `packages/web/server/routes/github`. Kept local (rather than using the Hono
// `InferResponseType` unions) because the panel narrows these at runtime after
// checking `connected`, and optional fields on a union are awkward to narrow.

export interface GitHubUserSummary {
  login: string | null;
  avatarUrl: string | null;
  id: number | null;
  name: string | null;
  email: string | null;
}

export interface GitHubAccount {
  id: string;
  user: GitHubUserSummary;
  scope: string;
  current: boolean;
  source?: 'gh-cli';
}

export interface GhCliState {
  available: boolean;
  disabled: boolean;
  active: boolean;
  user?: GitHubUserSummary;
}

export interface GitHubAuthStatus {
  connected: boolean;
  user?: GitHubUserSummary | null;
  scope?: string;
  accounts?: GitHubAccount[];
  ghCli?: GhCliState;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface RepoSourceRef extends RepoRef {
  source?: string;
}

export interface GitHubAuthor {
  login: string;
  id: number;
  avatarUrl: string;
}

export interface GitHubLabel {
  name: string;
  color?: string;
}

export type CheckState = 'success' | 'failure' | 'pending' | 'unknown';

export interface CheckRunSummary {
  state: CheckState;
  total: number;
  success: number;
  failure: number;
  pending: number;
  inProgress: number;
  queued: number;
  startedAt?: string;
}

export interface CheckRunStep {
  name: string;
  status?: string;
  conclusion?: string | null;
  number?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface CheckRunJob {
  runId: number;
  jobId?: number;
  url?: string;
  name?: string;
  workflowName?: string;
  conclusion?: string | null;
  steps?: CheckRunStep[];
}

export interface CheckRunAnnotation {
  path?: string;
  startLine?: number;
  endLine?: number;
  level?: string;
  message: string;
  title?: string;
  rawDetails?: string;
}

export interface CheckRunDetail {
  id: number;
  name: string;
  startedAt?: string;
  completedAt?: string;
  app?: { name?: string; slug?: string };
  status: string;
  conclusion: string | null;
  detailsUrl?: string;
  output?: { title?: string; summary?: string; text?: string };
  job?: CheckRunJob;
  annotations?: CheckRunAnnotation[];
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  base?: string;
  head?: string;
  headSha?: string;
  mergeable?: boolean | null;
  mergeableState?: string | null;
  author?: GitHubAuthor | null;
  headLabel?: string | null;
  headRepo?: { owner?: string; repo?: string; isFork?: boolean } | null;
  sourceRepo?: RepoSourceRef;
  label?: string;
  body?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GitHubPrStatus {
  connected?: boolean;
  repo?: RepoRef | null;
  branch?: string;
  pr?: PullRequest | null;
  checks?: CheckRunSummary | null;
  canMerge?: boolean;
  defaultBranch?: string | null;
  resolvedRemoteName?: string | null;
  error?: string;
}

export interface PullComment {
  id: number;
  url?: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  author?: GitHubAuthor | null;
  path?: string;
  line?: number | null;
  position?: number | null;
}

export interface PullFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubPullContext {
  connected?: boolean;
  repo?: RepoRef | null;
  pr?: PullRequest | null;
  issueComments?: PullComment[];
  reviewComments?: PullComment[];
  files?: PullFile[];
  checks?: CheckRunSummary | null;
  checkRuns?: CheckRunDetail[];
  fetchedAt?: number;
}

export interface PullSummary {
  number: number;
  title: string;
  url: string;
  state: string;
  draft: boolean;
  author?: GitHubAuthor | null;
  sourceRepo?: RepoSourceRef;
  base?: string;
  head?: string;
}

export interface GitHubPullList {
  connected?: boolean;
  repo?: RepoRef | null;
  prs?: PullSummary[];
  page?: number;
  hasMore?: boolean;
}

export interface IssueSummary {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  author?: GitHubAuthor | null;
  labels?: GitHubLabel[];
  sourceRepo?: RepoSourceRef;
}

export interface GitHubIssueList {
  connected?: boolean;
  repo?: RepoRef | null;
  issues?: IssueSummary[];
  page?: number;
  hasMore?: boolean;
}

export interface IssueDetail {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  body: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  author?: GitHubAuthor | null;
  assignees?: GitHubAuthor[];
  labels?: GitHubLabel[];
}

export interface GitHubIssue {
  connected?: boolean;
  repo?: RepoRef | null;
  issue?: IssueDetail | null;
  error?: string;
}

export interface GitHubIssueComments {
  connected?: boolean;
  repo?: RepoRef | null;
  comments?: PullComment[];
}

export interface GitHubBranches {
  branches: string[];
}

export interface GitHubUpstream {
  connected?: boolean;
  isFork?: boolean;
  upstream?: {
    owner: string;
    repo: string;
    url: string;
    defaultBranch: string;
    defaultBranchSha: string | null;
    remoteName: string | null;
  } | null;
}

export interface DeviceFlowStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
  scope: string;
  error?: string;
}

export interface DeviceFlowComplete {
  connected: boolean;
  status?: string;
  error?: string;
  user?: GitHubUserSummary;
  scope?: string;
  accounts?: GitHubAccount[];
}

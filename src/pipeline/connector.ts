import type { HttpClient } from "./http";

export interface ConnectorOptions {
  /** Re-download cached documents even if they are recent. */
  refresh?: boolean;
  /** Use only cached snapshots; never hit the network. */
  offline?: boolean;
}

export interface ConnectorContext {
  http: HttpClient;
  options: ConnectorOptions;
  log: (message: string) => void;
}

type ConnectorStatus =
  | "updated" // new data staged
  | "unchanged" // source answered, content identical
  | "unavailable" // source could not be reached: previous staging kept
  | "rejected"; // source answered with data that failed sanity checks: previous staging kept

export interface ConnectorOutcome {
  sourceId: string;
  status: ConnectorStatus;
  message?: string;
  warnings: string[];
}

export interface Connector {
  id: string;
  run(ctx: ConnectorContext): Promise<ConnectorOutcome>;
}

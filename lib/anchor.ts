/**
 * Future-facing seam for external timestamp anchoring. No provider is
 * implemented in this MVP; the application must not claim an external
 * timestamp or blockchain anchor exists.
 */
export interface AnchorReceipt {
  provider: string;
  externalId: string;
  anchoredAt: Date;
  digest: string;
  proof: string;
}

export interface AnchorProvider {
  readonly name: string;
  readonly description: string;
  anchor(recordHash: string): Promise<AnchorReceipt>;
  verify(receipt: AnchorReceipt, recordHash: string): Promise<boolean>;
}

/**
 * Deliberately unimplemented. Integrators can add a provider (RFC 3161,
 * transparency log, or chain) later without changing the record model. The
 * public verification surface should continue to distinguish local seal
 * integrity from external anchoring.
 */
export interface AnchorConfiguration {
  provider: AnchorProvider | null;
}

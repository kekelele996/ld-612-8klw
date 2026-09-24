import { readStorage } from "../utils/localStorage";
import type { PolicySection } from "../types/PolicySection";

const KEY = "policySection";

export async function listPolicySections(): Promise<PolicySection[]> {
  return readStorage<PolicySection[]>(KEY, []);
}

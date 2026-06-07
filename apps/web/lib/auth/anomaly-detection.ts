import 'server-only';

export interface AnomalyResult {
  isNewDevice: boolean;
  isNewLocation: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

const userHistory = new Map<string, { ipHashes: Set<string>; uaHashes: Set<string>; lastSeen: number }>();

export async function detectAnomalies(
  userId: string,
  ipHash: string,
  uaHash: string,
): Promise<AnomalyResult> {
  const history = userHistory.get(userId);

  if (!history) {
    userHistory.set(userId, {
      ipHashes: new Set([ipHash]),
      uaHashes: new Set([uaHash]),
      lastSeen: Date.now(),
    });
    return { isNewDevice: false, isNewLocation: false, riskLevel: 'low' };
  }

  history.lastSeen = Date.now();
  const isNewDevice = !history.uaHashes.has(uaHash);
  const isNewLocation = !history.ipHashes.has(ipHash);

  if (isNewDevice) history.uaHashes.add(uaHash);
  if (isNewLocation) history.ipHashes.add(ipHash);

  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (isNewDevice && isNewLocation) {
    riskLevel = 'high';
  } else if (isNewDevice || isNewLocation) {
    riskLevel = 'medium';
  }

  if (userHistory.size > 10000) {
    const keys = Array.from(userHistory.keys());
    for (const key of keys.slice(0, 1000)) {
      userHistory.delete(key);
    }
  }

  return { isNewDevice, isNewLocation, riskLevel };
}

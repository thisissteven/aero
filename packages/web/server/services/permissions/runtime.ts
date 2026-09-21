import { getAdapter } from '@/server/services/harness/registry';
import { getSetting } from '@/server/services/settings';

export async function handleOpencodePermissions(
  sessionID: string,
  permissionId: string,
) {
  const skipPermissions = await getSetting([
    'permissionAutoAcceptSessions',
    sessionID,
  ]);

  if (skipPermissions) {
    const harness = await getAdapter('opencode');
    const session = await harness.getSession(sessionID);
    await harness.replyToPermission(permissionId, session.workspace, 'once');
    return true;
  }

  return false;
}

// app/components/chat-aside/browser/browser-agent-controller.ts
//
// Imperative surface a mounted BrowserPane exposes so the agent bridge client
// can drive the live preview. One controller is registered per tab; the client
// picks the active tab's controller.

export interface BrowserPaneController {
  snapshot(params: Record<string, unknown>): Promise<unknown>;
  click(params: Record<string, unknown>): Promise<unknown>;
  type(params: Record<string, unknown>): Promise<unknown>;
  scroll(params: Record<string, unknown>): Promise<unknown>;
  inspect(params: Record<string, unknown>): Promise<unknown>;
  capture(params: Record<string, unknown>): Promise<unknown>;
  clearCache(): Promise<unknown>;
  clearStorage(): Promise<unknown>;
  back(): Promise<unknown>;
  forward(): Promise<unknown>;
}

const controllers = new Map<string, BrowserPaneController>();

export function registerBrowserPaneController(
  tabId: string,
  controller: BrowserPaneController,
): () => void {
  controllers.set(tabId, controller);

  return () => {
    if (controllers.get(tabId) === controller) {
      controllers.delete(tabId);
    }
  };
}

export function getBrowserPaneController(
  tabId: string | null,
): BrowserPaneController | null {
  if (!tabId) return null;
  return controllers.get(tabId) ?? null;
}

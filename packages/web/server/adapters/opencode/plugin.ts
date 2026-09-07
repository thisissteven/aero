import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { AERO_PLUGIN_PATH } from '@/server/helper';

export async function installAeroPlugin() {
  await mkdir(dirname(AERO_PLUGIN_PATH), { recursive: true });
  await writeFile(AERO_PLUGIN_PATH, AERO_PLUGIN.trimStart(), 'utf8');
}

const AERO_PLUGIN = `
export const AeroPlugin = async () => ({
  tool: {
    aero: {
      description: "Control Aero projects, sessions, and scheduled tasks on the user's behalf. Sessions and scheduled tasks you create are for the user to follow and interact with; never use this tool to delegate parts of your own current task. Use one action per call. Scope with projectId or directory; omit both to use the current session directory. Session dispatches return immediately by default and you receive no notification when a dispatched session finishes, so never promise to report back on it; the user follows it in Aero; a dispatched session needs no follow-up from you. If the user later asks how it went, use session.messages (add wait to block until it is idle, lastAssistant for just the final answer) — session.send always sends a NEW prompt and never just waits. Set wait only when the user asks or the next step requires the completed result. Session and worktree deletion are unavailable.",
      args: {
        action: { type: "string", enum: ["projects.list","models.list","session.list","session.create","session.send","session.fork","session.status","session.messages","schedule.list","schedule.create","schedule.run","schedule.delete","schedule.toggle"], oneOf: [{"const":"projects.list","description":"List configured projects; no parameters"},{"const":"models.list","description":"Show default, favorite, and recent model preferences; no parameters"},{"const":"session.list","description":"List sessions; optional directory, limit (default 10), all, or withStatus"},{"const":"session.create","description":"Create a session in the current directory by default; prompt is optional"},{"const":"session.send","description":"Send a new prompt to sessionId; scope with projectId or directory"},{"const":"session.fork","description":"Fork sessionId; messageId selects the boundary; prompt is optional"},{"const":"session.status","description":"Check sessionId status; directory defaults to the current session"},{"const":"session.messages","description":"Read text-only messages and current sessionStatus for sessionId; directory and limit 10 are defaults"},{"const":"schedule.list","description":"List tasks and scheduler status; scope with projectId or directory"},{"const":"schedule.create","description":"Create task; requires name, prompt, model, and one schedule selector"},{"const":"schedule.run","description":"Run taskId; scope with projectId or directory"},{"const":"schedule.delete","description":"Delete taskId; scope with projectId or directory"},{"const":"schedule.toggle","description":"Enable or disable taskId; requires the disabled boolean"}], description: "Aero action to perform" },
        parameters: { type: "object", properties: {"projectId":{"type":"string","description":"Configured project ID; do not combine with directory"},"directory":{"type":"string","description":"Absolute checkout or session directory; defaults to the current session directory"},"sessionId":{"type":"string"},"messageId":{"type":"string","description":"Optional fork boundary message ID"},"taskId":{"type":"string"},"title":{"type":"string"},"prompt":{"type":"string"},"model":{"type":"string","description":"Model in provider/model format. When the user names no model: for session.create pick a suitable one from models.list favorites or recents (omit if there are none); for send and fork omit it — the session reuses its previous model"},"agent":{"type":"string","description":"OpenCode agent name; new sessions default to the build agent and existing sessions keep their previous one. Set only when the user explicitly requests a different agent"},"variant":{"type":"string","description":"Model variant; use only when the user explicitly requests it"},"worktree":{"type":"string","description":"New worktree name for session.create. Omit by default; use only when the user explicitly asks for an isolated worktree. Uncommitted changes do not carry over into a new worktree"},"branch":{"type":"string","description":"Branch name for the new worktree"},"startRef":{"type":"string","description":"Git ref used to create the new worktree"},"setUpstream":{"type":"boolean","description":"Make the new worktree branch track its upstream"},"goal":{"type":"boolean","description":"Run the dispatched prompt in Goal Mode; use only when the user explicitly requests it"},"goalTokenBudget":{"type":"integer","minimum":1000,"maximum":100000000,"description":"Goal token budget; requires goal"},"wait":{"type":"boolean","description":"Wait for current session activity to become idle. Omit by default; use only when the user asks or the next step requires the completed result"},"timeout":{"type":"integer","minimum":1,"maximum":86400,"description":"Wait timeout in seconds (default 600); requires wait"},"lastAssistant":{"type":"boolean","description":"Return the last assistant text; create/send/fork require wait"},"limit":{"type":"integer","minimum":1,"description":"Maximum sessions or messages to return (default 10)"},"all":{"type":"boolean","description":"Include archived sessions or all messages, depending on the action"},"last":{"type":"boolean","description":"Return only the last matching session message"},"withStatus":{"type":"boolean","description":"Include authoritative status in session.list"},"role":{"type":"string","enum":["all","user","assistant"],"description":"Message role filter"},"name":{"type":"string"},"daily":{"type":"string","description":"Daily run time in HH:mm format"},"weekly":{"type":"string","description":"Comma-separated weekdays; 0=Sunday and 6=Saturday"},"once":{"type":"string","description":"One-time run date in YYYY-MM-DD format"},"time":{"type":"string","description":"Weekly or one-time run time in HH:mm format"},"cron":{"type":"string","description":"Cron expression"},"timezone":{"type":"string","description":"IANA timezone"},"disabled":{"type":"boolean","description":"true disables and false enables; required for schedule.toggle"}}, additionalProperties: false, description: "Inputs for the action; use an empty object when none are needed" },
      },
      async execute(input, context) {
        // Models routinely put the inputs next to the action instead of inside
        // the parameters object, and dropping them there produced a
        // "url is required" error for a call that plainly carried a url. Both
        // shapes are accepted; an explicit parameters object wins on a conflict.
        const { action: requestedAction, parameters, ...flattened } = input ?? {}
        const args = { ...flattened, ...(parameters ?? {}), action: requestedAction }
        const actionTitles = {"projects.list":"List configured projects","models.list":"Show model preferences","session.list":"List sessions","session.create":"Create a session","session.send":"Send a prompt","session.fork":"Fork a session","session.status":"Check session status","session.messages":"Read session messages","schedule.list":"List scheduled tasks","schedule.create":"Create a scheduled task","schedule.run":"Run a scheduled task","schedule.delete":"Delete a scheduled task","schedule.toggle":"Enable or disable a scheduled task","browser.open":"Open a page in the browser panel","browser.snapshot":"Read the open page","browser.click":"Click on the open page","browser.type":"Type into the open page","browser.scroll":"Scroll the open page","browser.back":"Go back in the browser panel","browser.forward":"Go forward in the browser panel","browser.inspect":"Read how an element renders","browser.capture":"Save a screenshot of the page","browser.resize":"Change the page viewport","memory.read":"Read a stored memory","memory.list":"List stored memories","memory.save":"Remember something","memory.delete":"Forget a memory"}
        const title = Object.hasOwn(actionTitles, args.action) ? actionTitles[args.action] : args.action
        context.metadata({
          title,
          metadata: {
            aero: {
              schemaVersion: 1,
              action: args.action,
              description: title,
            },
          },
        })
        const endpoint = process.env.AERO_AGENT_TOOL_URL
        const token = process.env.AERO_AGENT_TOOL_TOKEN
        const failure = (payload) => ({
          title,
          output: JSON.stringify(payload),
          metadata: { aero: { schemaVersion: 1, action: args.action, description: title, ok: false } },
        })
        if (!endpoint || !token) {
          return failure({ schemaVersion: 1, ok: false, action: args.action, error: { message: "Aero managed tool connection is unavailable" } })
        }

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              authorization: "Bearer " + token,
              "content-type": "application/json",
            },
            body: JSON.stringify({ input: args, contextDirectory: context.directory, tool: "aero" }),
            signal: context.abort,
          })
          const output = await response.text()
          let result = null
          try { result = JSON.parse(output) } catch {}
          const valid = result?.schemaVersion === 1 && typeof result?.ok === "boolean" && typeof result?.action === "string"
          context.metadata({
            title,
            metadata: {
              aero: {
                schemaVersion: 1,
                action: args.action,
                description: title,
                ok: valid && result.ok === true,
              },
            },
          })
          if (valid) return { title, output, metadata: { aero: { schemaVersion: 1, action: args.action, description: title, ok: result.ok === true } } }
          return failure({ schemaVersion: 1, ok: false, action: args.action, error: { message: "Aero returned an invalid response", kind: "runtime", status: response.status } })
        } catch (error) {
          if (context.abort.aborted) throw error
          return failure({ schemaVersion: 1, ok: false, action: args.action, error: { message: error instanceof Error ? error.message : String(error), kind: "runtime" } })
        }
      },
    },
    aero_web: {
      description: "Look at and interact with a web page in Aero's browser panel, so you can check your own work rather than describing what you expect. Use one action per call. Open a page, snapshot it to read its text and its interactive elements, then click, type or scroll using the selectors the snapshot returned; snapshots also report any errors the page logged. Pass a selector to browser.snapshot to read one part of a long page. browser.inspect returns computed styles when the question is how something renders. Set viewport to check a layout at mobile, tablet or desktop size. The page runs with the user's real logins, so treat what you see as their live session.",
      args: {
        action: { type: "string", enum: ["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"], oneOf: [{"const":"browser.open","description":"Open url in the in-app browser panel; use it to look at the running app. Set viewport to mobile, tablet or desktop to lay the page out at that size"},{"const":"browser.snapshot","description":"Read the open page: url, title, visible text, and interactive elements with the selectors the other browser actions accept. Pass selector to read only that part of a long page. Reports any errors the page logged"},{"const":"browser.click","description":"Click an element; give selector, or text to match a link or button by its visible label"},{"const":"browser.type","description":"Type value into the field matched by selector; set submit to press Enter afterwards"},{"const":"browser.scroll","description":"Scroll the page; direction is up, down, top, or bottom, or pass selector to bring one element into view"},{"const":"browser.back","description":"Return to the previous page in this tab; no parameters"},{"const":"browser.forward","description":"Move forward again in this tab; no parameters"},{"const":"browser.inspect","description":"Read the computed styles of the element matched by selector — colours, fonts, spacing, borders — as the page actually renders them"},{"const":"browser.capture","description":"Save what is currently visible in the browser panel as an image file in the project and return its path, so a change can be shown rather than described. Pass label to name it (for example before-fix); the result reports the page, layout and path to reference in your answer"},{"const":"browser.resize","description":"Lay the open page out at a different size; viewport is mobile, tablet, desktop, or fill to use the whole panel"}], description: "Aero action to perform" },
        parameters: { type: "object", properties: {"url":{"type":"string","description":"http(s) URL for browser.open"},"selector":{"type":"string","description":"CSS selector from a browser.snapshot result"},"text":{"type":"string","description":"Visible label to match when no selector is given"},"value":{"type":"string","description":"Text to type for browser.type"},"submit":{"type":"boolean","description":"Press Enter after typing"},"direction":{"type":"string","enum":["up","down","top","bottom"],"description":"Scroll direction for browser.scroll"},"viewport":{"type":"string","enum":["mobile","tablet","desktop","fill"],"description":"Page layout size; snapshots report which one is in effect"},"label":{"type":"string","description":"Short name for a browser.capture image, such as before-fix"}}, additionalProperties: false, description: "Inputs for the action; use an empty object when none are needed" },
      },
      async execute(input, context) {
        // Models routinely put the inputs next to the action instead of inside
        // the parameters object, and dropping them there produced a
        // "url is required" error for a call that plainly carried a url. Both
        // shapes are accepted; an explicit parameters object wins on a conflict.
        const { action: requestedAction, parameters, ...flattened } = input ?? {}
        const args = { ...flattened, ...(parameters ?? {}), action: requestedAction }
        const actionTitles = {"projects.list":"List configured projects","models.list":"Show model preferences","session.list":"List sessions","session.create":"Create a session","session.send":"Send a prompt","session.fork":"Fork a session","session.status":"Check session status","session.messages":"Read session messages","schedule.list":"List scheduled tasks","schedule.create":"Create a scheduled task","schedule.run":"Run a scheduled task","schedule.delete":"Delete a scheduled task","schedule.toggle":"Enable or disable a scheduled task","browser.open":"Open a page in the browser panel","browser.snapshot":"Read the open page","browser.click":"Click on the open page","browser.type":"Type into the open page","browser.scroll":"Scroll the open page","browser.back":"Go back in the browser panel","browser.forward":"Go forward in the browser panel","browser.inspect":"Read how an element renders","browser.capture":"Save a screenshot of the page","browser.resize":"Change the page viewport","memory.read":"Read a stored memory","memory.list":"List stored memories","memory.save":"Remember something","memory.delete":"Forget a memory"}
        const title = Object.hasOwn(actionTitles, args.action) ? actionTitles[args.action] : args.action
        context.metadata({
          title,
          metadata: {
            aero_web: {
              schemaVersion: 1,
              action: args.action,
              description: title,
            },
          },
        })
        const endpoint = process.env.AERO_AGENT_TOOL_URL
        const token = process.env.AERO_AGENT_TOOL_TOKEN
        const failure = (payload) => ({
          title,
          output: JSON.stringify(payload),
          metadata: { aero: { schemaVersion: 1, action: args.action, description: title, ok: false } },
        })
        if (!endpoint || !token) {
          return failure({ schemaVersion: 1, ok: false, action: args.action, error: { message: "Aero managed tool connection is unavailable" } })
        }

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              authorization: "Bearer " + token,
              "content-type": "application/json",
            },
            body: JSON.stringify({ input: args, contextDirectory: context.directory, tool: "aero_web" }),
            signal: context.abort,
          })
          const output = await response.text()
          let result = null
          try { result = JSON.parse(output) } catch {}
          const valid = result?.schemaVersion === 1 && typeof result?.ok === "boolean" && typeof result?.action === "string"
          context.metadata({
            title,
            metadata: {
              aero_web: {
                schemaVersion: 1,
                action: args.action,
                description: title,
                ok: valid && result.ok === true,
              },
            },
          })
          if (valid) return { title, output, metadata: { aero: { schemaVersion: 1, action: args.action, description: title, ok: result.ok === true } } }
          return failure({ schemaVersion: 1, ok: false, action: args.action, error: { message: "Aero returned an invalid response", kind: "runtime", status: response.status } })
        } catch (error) {
          if (context.abort.aborted) throw error
          return failure({ schemaVersion: 1, ok: false, action: args.action, error: { message: error instanceof Error ? error.message : String(error), kind: "runtime" } })
        }
      },
    },
  },
})
`;

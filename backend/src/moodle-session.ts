import { getDb } from "./db/client.js";

const MOODLE_BASE = "https://www.moodle.tum.de";
const SHIB_LOGIN = `${MOODLE_BASE}/Shibboleth.sso/Login?providerId=https%3A%2F%2Ftumidp.lrz.de%2Fidp%2Fshibboleth&target=https%3A%2F%2Fwww.moodle.tum.de%2Fauth%2Fshibboleth%2Findex.php`;

function extractCookies(res: Response): string[] {
  const out: string[] = [];
  for (const val of res.headers.getSetCookie()) {
    const pair = val.split(";")[0];
    if (pair) out.push(pair);
  }
  return out;
}

function mergeCookies(jar: Map<string, string>, fresh: string[]) {
  for (const c of fresh) {
    const eq = c.indexOf("=");
    if (eq > 0) jar.set(c.slice(0, eq), c.slice(eq + 1));
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function resolveUrl(relative: string, base: string): string {
  const decoded = decodeHtmlEntities(relative);
  if (decoded.startsWith("http")) return decoded;
  return new URL(decoded, base).href;
}

function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re = /<input[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    if (!/type\s*=\s*"hidden"/i.test(tag)) continue;
    const nameMatch = tag.match(/name\s*=\s*"([^"]+)"/);
    const valueMatch = tag.match(/value\s*=\s*"([^"]*)"/);
    if (nameMatch) fields[nameMatch[1]] = decodeHtmlEntities(valueMatch?.[1] ?? "");
  }
  return fields;
}

function extractFormAction(html: string, baseUrl: string): string {
  const match = html.match(/<form[^>]*action="([^"]+)"/);
  if (!match) throw new Error("Could not find form action");
  return resolveUrl(match[1].replace(/&amp;/g, "&"), baseUrl);
}

async function fetchFollow(
  url: string,
  jar: Map<string, string>,
  init?: RequestInit,
): Promise<{ res: Response; url: string }> {
  let currentUrl = url;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(currentUrl, {
      ...init,
      headers: { ...((init?.headers as Record<string, string>) ?? {}), Cookie: cookieHeader(jar) },
      redirect: "manual",
    });
    mergeCookies(jar, extractCookies(res));
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { res, url: currentUrl };
      currentUrl = resolveUrl(loc, currentUrl);
      init = undefined;
    } else {
      return { res, url: currentUrl };
    }
  }
  throw new Error("Too many redirects");
}

/**
 * Perform the full Shibboleth SAML2 flow against TUM's IdP
 * and return a MoodleSession cookie value.
 *
 * TUM IdP flow:
 *   1. Moodle SP → 302 → IdP with SAMLRequest
 *   2. IdP → 302 → execution=eNs1 (localStorage check form)
 *   3. POST localStorage form → 302 → execution=eNs2 (actual login form)
 *   4. POST credentials → 200 with SAMLResponse auto-submit form (or 302 → page with it)
 *   5. POST SAMLResponse to Moodle ACS → 302 chain → MoodleSession cookie
 */
export async function moodleLogin(
  username: string,
  password: string,
): Promise<{ session: string; sessKey: string; userId: number }> {
  const jar = new Map<string, string>();
  const log = (msg: string) => console.log(`[moodle-auth] ${msg}`);

  // Step 1-2: Moodle SP → IdP → localStorage check page
  log("Starting SAML flow...");
  const { res: lsPage, url: lsPageUrl } = await fetchFollow(SHIB_LOGIN, jar);
  log(`IdP localStorage page: ${lsPageUrl} (${lsPage.status})`);
  const lsHtml = await lsPage.text();

  // Step 3: submit the localStorage check form (simulates the JS auto-submit)
  const lsFields = extractHiddenFields(lsHtml);
  lsFields["shib_idp_ls_supported"] = "true";
  const lsAction = extractFormAction(lsHtml, lsPageUrl);
  log(`Submitting localStorage form to: ${lsAction}`);
  const { res: loginPage, url: loginPageUrl } = await fetchFollow(lsAction, jar, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(lsFields).toString(),
  });
  log(`Login form page: ${loginPageUrl} (${loginPage.status})`);
  const loginHtml = await loginPage.text();

  if (!loginHtml.includes("j_username")) {
    throw new Error("Unexpected IdP page — no login form found");
  }

  // Step 4: submit credentials
  const loginFields = extractHiddenFields(loginHtml);
  const loginAction = extractFormAction(loginHtml, loginPageUrl);
  const credBody = new URLSearchParams({
    ...loginFields,
    j_username: username,
    j_password: password,
    _eventId_proceed: "",
  });

  log(`Submitting credentials to: ${loginAction}`);
  const { res: samlPage, url: samlPageUrl } = await fetchFollow(loginAction, jar, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: credBody.toString(),
  });
  log(`Post-login page: ${samlPageUrl} (${samlPage.status})`);
  const samlHtml = await samlPage.text();

  // Check for login failure — IdP re-shows the login form
  if (samlHtml.includes("j_username") && !samlHtml.includes("SAMLResponse")) {
    throw new Error("Invalid credentials");
  }
  log("Got SAMLResponse from IdP");

  // Step 5: extract SAMLResponse + RelayState via the shared hidden-field parser
  const samlFields = extractHiddenFields(samlHtml);
  const samlResponse = samlFields["SAMLResponse"];
  if (!samlResponse) {
    throw new Error("SAML authentication failed — no SAMLResponse in IdP reply");
  }
  const relayState = samlFields["RelayState"] ?? "";

  const acsUrl = extractFormAction(samlHtml, samlPageUrl);

  // Step 6: POST SAML assertion to Moodle's Shibboleth ACS and follow redirects
  log(`Posting SAMLResponse to ACS: ${acsUrl}`);
  await fetchFollow(acsUrl, jar, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SAMLResponse: samlResponse, RelayState: relayState }).toString(),
  });

  const moodleSession = jar.get("MoodleSession");
  if (!moodleSession) {
    log(`Cookies in jar: ${[...jar.keys()].join(", ")}`);
    throw new Error("No MoodleSession cookie received");
  }
  log(`Got MoodleSession cookie`);

  // Step 7: get sesskey and userid from a Moodle page
  const { res: dashRes, url: dashUrl } = await fetchFollow(`${MOODLE_BASE}/my/`, jar);
  log(`Dashboard page: ${dashUrl} (${dashRes.status})`);
  const dashHtml = await dashRes.text();
  const sessKeyMatch = dashHtml.match(/"sesskey"\s*:\s*"([^"]+)"/);
  if (!sessKeyMatch) {
    log(`Dashboard HTML snippet: ${dashHtml.slice(0, 500)}`);
    throw new Error("Could not extract sesskey from Moodle session");
  }
  const sessKey = sessKeyMatch[1];

  const userIdMatch = dashHtml.match(/"userid"\s*:\s*(\d+)/)
    || dashHtml.match(/data-userid="(\d+)"/)
    || dashHtml.match(/"id"\s*:\s*(\d+)\s*,\s*"username"/);
  const userId = userIdMatch ? parseInt(userIdMatch[1], 10) : 0;
  log(`Authenticated as userId=${userId}, sessKey=${sessKey.slice(0, 6)}...`);
  if (userId === 0) {
    log(`WARNING: userId=0, trying to extract from page. Snippets with 'user': ${
      (dashHtml.match(/.{0,60}user.{0,60}/gi) || []).slice(0, 5).join(" | ")
    }`);
  }

  return { session: moodleSession, sessKey, userId };
}

/**
 * Call a Moodle AJAX web service function using session auth.
 */
export async function moodleAjax(
  session: string,
  sessKey: string,
  methodname: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const url = `${MOODLE_BASE}/lib/ajax/service.php?sesskey=${encodeURIComponent(sessKey)}&info=${encodeURIComponent(methodname)}`;
  console.log(`[moodle-ajax] ${methodname} args=${JSON.stringify(args)}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `MoodleSession=${session}`,
    },
    body: JSON.stringify([{ index: 0, methodname, args }]),
    redirect: "manual",
  });
  console.log(`[moodle-ajax] ${methodname} → HTTP ${res.status}, content-type: ${res.headers.get("content-type")}`);

  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Moodle session expired (redirected to ${res.headers.get("location")})`);
  }
  if (!res.ok) throw new Error(`Moodle AJAX returned HTTP ${res.status}`);

  const text = await res.text();
  console.log(`[moodle-ajax] ${methodname} body (${text.length} chars): ${text.slice(0, 500)}`);

  if (!text) throw new Error(`Moodle AJAX returned empty response for ${methodname}`);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Moodle returned non-JSON for ${methodname}: ${text.slice(0, 200)}`);
  }

  if (Array.isArray(data) && data[0]?.error) {
    const exc = data[0].exception;
    console.error(`[moodle-ajax] ${methodname} ERROR: ${exc?.errorcode} — ${exc?.message}`);
    throw new Error(exc?.message || data[0].error);
  }
  return Array.isArray(data) ? data[0]?.data : data;
}

function getSetting(key: string): string | undefined {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function getMoodleSession(): { session: string; sessKey: string; userId: number } | null {
  const session = getSetting("moodle_session");
  const sessKey = getSetting("moodle_sesskey");
  const userId = getSetting("moodle_userid");
  if (!session || !sessKey) return null;
  return { session, sessKey, userId: userId ? parseInt(userId, 10) : 0 };
}

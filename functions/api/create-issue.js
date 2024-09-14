import { App } from "octokit";

const allowedOrigins = ["https://kadantiscam.netlify.app", "https://polishannoyancefilters.netlify.app"];
var corsHeaders = {
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400"
};
  

// Respond to OPTIONS method
export async function onRequestOptions(context) {
    var origin = context.request.headers.get('origin');
    if (allowedOrigins.includes(origin)) {
        corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
};
  
// Set CORS to all /api responses
export async function onRequest(context) {
    const response = await context.next();
    var origin = context.request.headers.get('origin');
    if (allowedOrigins.includes(origin)) {
        corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
    response.headers = corsHeaders;
    return response;
};

export async function onRequestPost(context) {
    try {
        let input = await context.request.json();
        console.log(input);
        var chosenRepo = ""
        if (!input.repo || !input.title || !input.body) {
            return new Response('Some params are missing', { status: 400 });
        }
        if (input.repo == "KAD" || input.repo == "PolishAnnoyanceFilters") {
            chosenRepo = input.repo
        }

        if (chosenRepo != "") {
            try {
                const app = new App({
                    appId: context.env.FH_POSTMAN_APP_ID,
                    privateKey: context.env.FH_POSTMAN_APP_PRIVATE_KEY,
                });
                const octokit = await app.getInstallationOctokit(context.env.FH_POSTMAN_APP_INSTALLATION_ID);

                var createIssue = await octokit.rest.issues.create({
                    owner: "FiltersHeroes",
                    repo: chosenRepo,
                    title: input.title,
                    body: input.body,
                });
                if (createIssue.html_url) {
                    return new Response(createIssue.html_url, { status: 200 });
                }
            }
            catch (error) {
                return new Response('An error occured while sending issue to GitHub', { status: 400 });
            }
        }
        return new Response('You sent wrong data', { status: 400 });
    } catch (err) {
        return new Response('Error parsing content', { status: 400 });
    }
};
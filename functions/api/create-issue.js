import { App } from "octokit";

const allowedOrigins = ["https://kadantiscam.netlify.app", "https://polishannoyancefilters.netlify.app"];
var corsHeaders = {
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400"
};

var responseErrorStatus = 400;

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
    for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
    }
    return response;
};

export async function onRequestPost(context) {
    try {
        var origin = context.request.headers.get('origin');
        if (allowedOrigins.includes(origin)) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        }
        let input = await context.request.json();
        var chosenRepo = "";
        if (!input.repo || !input.title || !input.body) {
            return new Response('Some params are missing', { status: responseErrorStatus, headers: corsHeaders });
        }
        if (input.repo == "KAD" || input.repo == "PolishAnnoyanceFilters") {
            chosenRepo = input.repo;
        }

        if (chosenRepo.length > 0) {
            try {
                const app = new App({
                    appId: context.env.FH_POSTMAN_APP_ID,
                    privateKey: context.env.FH_POSTMAN_APP_PRIVATE_KEY,
                });
                const octokit = await app.getInstallationOctokit(context.env.FH_POSTMAN_APP_INSTALLATION_ID);

                var createIssueReponse = await octokit.rest.issues.create({
                    owner: "FiltersHeroes",
                    repo: chosenRepo,
                    title: input.title,
                    body: input.body,
                });
                if (createIssueReponse) {
                    console.log(createIssueReponse);
                    responseErrorStatus = createIssueReponse.status;
                    if (createIssueReponse.data) {
                        var issueHtmlUrl = createIssueReponse.data.html_url;
                        if (issueHtmlUrl) {
                            return new Response(issueHtmlUrl, { status: 200, headers: corsHeaders });
                        }
                    }
                    return new Response('An error occured while sending issue to GitHub', { status: responseErrorStatus, headers: corsHeaders });
                }
            }
            catch (error) {
                return new Response('An error occured while sending issue to GitHub', { status: responseErrorStatus, headers: corsHeaders });
            }
        }
        else {
            return new Response('You sent wrong data', { status: responseErrorStatus, headers: corsHeaders });
        }
    } catch (err) {
        return new Response('Error parsing content', { status: responseErrorStatus, headers: corsHeaders });
    }
};
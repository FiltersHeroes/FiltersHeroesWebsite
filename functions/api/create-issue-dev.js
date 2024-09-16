import jwt from '@tsndr/cloudflare-worker-jwt'

const allowedOrigins = ["https://kadantiscam.netlify.app", "https://polishannoyancefilters.netlify.app"];
var corsHeaders = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400"
};
var responseErrorStatus = 400;

function setAllowOrigin(context) {
    var origin = context.request.headers.get('origin');
    if (allowedOrigins.includes(origin)) {
        corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
}

async function createJwt(privateKey, clientId) {
    var jwtHeader = {
        typ: 'JWT',
        alg: "RS256",
    };
    var now = Date.now();
    var expires = new Date(now + 10 * 6000);
    var jwtPayload = {
        iss: clientId,
        iat: Math.round(now / 1000),
        exp: Math.round(expires.getTime() / 1000),
    };
    return await jwt.sign(jwtPayload, privateKey, { algorithm: "RS256", header: jwtHeader });
};

async function getAppToken(appInstallationId, jwtToken, userAgent) {
    var appInstallationToken = "";
    var appInstallationTokenResponse = await fetch(`https://api.github.com/app/installations/${appInstallationId}/access_tokens`, {
        method: "POST",
        headers: {
            "Accept": 'application/vnd.github+json',
            "Authorization": 'Bearer ' + jwtToken,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": userAgent,
        },
    });
    if (appInstallationTokenResponse) {
        responseErrorStatus = appInstallationTokenResponse.status;
        if (appInstallationTokenResponse.ok) {
            const appInstallationTokenResponseResult = await appInstallationTokenResponse.json();
            appInstallationToken = await appInstallationTokenResponseResult.token;
        }
        else {
            Promise.reject(appInstallationTokenResponse);
        }
    }
    return appInstallationToken;
}

// Respond to OPTIONS method
// export async function onRequestOptions(context) {
//     setAllowOrigin(context);
//     return new Response(null, {
//         status: 204,
//         headers: corsHeaders
//     });
// };

export async function onRequestPost(context) {
    try {
        setAllowOrigin(context);
        let input = await context.request.json();
        var chosenRepo = "";
        if (input.repo == "KAD" || input.repo == "PolishAnnoyanceFilters") {
            chosenRepo = input.repo;
        }

        if (chosenRepo.length > 0) {
            var createIssueParams = {
                title: input.title,
                body: input.body,
            };
            if (input.labels) {
                createIssueParams["labels"] = input.labels;
            }
            var userAgent = "FiltersHeroesWebsite";

            const jwtToken = await createJwt(context.env.FH_POSTMAN_APP_PRIVATE_KEY, context.env.FH_POSTMAN_APP_CLIENT_ID);

            const appInstallationToken = await getAppToken(context.env.FH_POSTMAN_APP_INSTALLATION_ID, jwtToken, userAgent);

            if (appInstallationToken) {
                var createIssueResponse = await fetch(`https://api.github.com/repos/FiltersHeroes/${chosenRepo}/issues`, {
                    method: "POST",
                    headers: {
                        "Authorization": 'Bearer ' + appInstallationToken,
                        "Accept": 'application/vnd.github+json',
                        "X-GitHub-Api-Version": "2022-11-28",
                        "User-Agent": userAgent,
                    },
                    body: JSON.stringify(createIssueParams),
                });
                responseErrorStatus = createIssueResponse.status;

                if (createIssueResponse.ok) {
                    const createIssueResponseResult = await createIssueResponse.json();
                    if (createIssueResponseResult) {
                        console.log(createIssueResponseResult);
                        var issueHtmlUrl = createIssueResponseResult.html_url;
                        if (issueHtmlUrl) {
                            return new Response(issueHtmlUrl, { status: 200, headers: corsHeaders });
                        }
                    }
                }
                else {
                    Promise.reject(createIssueResponse);
                }
            }
        }
        else {
            return new Response('You sent wrong data', { status: responseErrorStatus, headers: corsHeaders });
        }
    } catch (err) {
        return new Response(`An error occured while sending issue to GitHub: ${err}`, { status: responseErrorStatus, headers: corsHeaders });
    }
    return new Response(`An error occured while sending issue to GitHub`, { status: responseErrorStatus, headers: corsHeaders });
};
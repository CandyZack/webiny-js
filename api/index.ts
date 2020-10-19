import * as pulumi from "@pulumi/pulumi";
import getDatabase from "./stack/database";
import Cognito from "./stack/cognito";
import Security from "./stack/security";
import SettingsManager from "./stack/settingsManager";
import I18N from "./stack/i18n";
import ApiGateway from "./stack/apiGateway";
import Cloudfront from "./stack/cloudfront";
import ApolloGateway from "./stack/apolloGateway";
import FileManager from "./stack/fileManager";
import PageBuilder from "./stack/pageBuilder";
import FormBuilder from "./stack/formBuilder";
import HeadlessCms from "./stack/headlessCms";
import GraphQLPlayground from "./stack/graphqlPlayground";

const database = getDatabase();

const cognito = new Cognito();

const settingsManager = new SettingsManager({
    dbProxy: database.databaseProxy
});

const graphqlServiceEnv: { [key: string]: any } = {
    COGNITO_REGION: String(process.env.AWS_REGION),
    COGNITO_USER_POOL_ID: cognito.userPool.id,
    DEBUG: String(process.env.DEBUG),
    DB_PROXY_FUNCTION: database.databaseProxy.arn,
    GRAPHQL_INTROSPECTION: String(process.env.GRAPHQL_INTROSPECTION),
    GRAPHQL_PLAYGROUND: String(process.env.GRAPHQL_PLAYGROUND),
    SETTINGS_MANAGER_FUNCTION: settingsManager.functions.settings.arn
};

const security = new Security({
    dbProxy: database.databaseProxy,
    env: graphqlServiceEnv
});

graphqlServiceEnv.VALIDATE_ACCESS_TOKEN_FUNCTION = security.functions.validateAccessToken.arn;
graphqlServiceEnv.PERMISSIONS_MANAGER_FUNCTION = security.functions.permissionsManager.arn;

const i18n = new I18N({
    dbProxy: database.databaseProxy,
    env: graphqlServiceEnv
});

const fileManager = new FileManager({
    env: {
        graphql: graphqlServiceEnv
    }
});

const pageBuilder = new PageBuilder({
    bucket: fileManager.bucket,
    fileManagerFunction: fileManager.functions.graphql,
    env: { graphql: graphqlServiceEnv }
});

const formBuilder = new FormBuilder({
    i18nLocalesFunction: i18n.functions.locales,
    env: {
        graphql: graphqlServiceEnv
    }
});

const headlessCms = new HeadlessCms({
    dbProxyFunction: database.databaseProxy,
    i18nLocalesFunction: i18n.functions.locales,
    settingsManagerFunction: settingsManager.functions.settings,
    env: {
        graphql: graphqlServiceEnv,
        content: graphqlServiceEnv
    }
});

const apolloGateway = new ApolloGateway({
    env: {
        ...graphqlServiceEnv,
        LAMBDA_SERVICE_SECURITY: security.functions.graphql.arn,
        LAMBDA_SERVICE_I18N: i18n.functions.graphql.arn,
        LAMBDA_SERVICE_FILE_MANAGER: fileManager.functions.graphql.arn,
        LAMBDA_SERVICE_PAGE_BUILDER: pageBuilder.functions.graphql.arn,
        LAMBDA_SERVICE_FORM_BUILDER: formBuilder.functions.graphql.arn,
        LAMBDA_SERVICE_HEADLESS_CMS: headlessCms.functions.graphql.arn
    }
});

const graphqlPlayground = new GraphQLPlayground();

const apiGateway = new ApiGateway({
    routes: [
        {
            name: "graphql-post",
            path: "/graphql",
            method: "POST",
            function: apolloGateway.functions.gateway
        },
        {
            name: "graphql-options",
            path: "/graphql",
            method: "OPTIONS",
            function: apolloGateway.functions.gateway
        },
        {
            name: "graphql-get",
            path: "/graphql",
            method: "GET",
            function: graphqlPlayground.function
        },
        {
            name: "files-any",
            path: "/files/{path}",
            method: "ANY",
            function: fileManager.functions.download
        },
        {
            name: "cms-get",
            path: "/cms/{key+}",
            method: "GET",
            function: graphqlPlayground.function
        },
        {
            name: "cms-post",
            path: "/cms/{key+}",
            method: "POST",
            function: headlessCms.functions.content
        },
        {
            name: "cms-options",
            path: "/cms/{key+}",
            method: "OPTIONS",
            function: headlessCms.functions.content
        }
    ]
});

const cloudfront = new Cloudfront({ apiGateway });

export const region = process.env.AWS_REGION;
export const cdnDomain = cloudfront.cloudfront.domainName;
export const cognitoUserPoolId = cognito.userPool.id;
export const cognitoAppClientId = cognito.userPoolClient.id;

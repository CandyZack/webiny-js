import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import vpc from "./vpc";
import defaultLambdaRole from "./defaultLambdaRole";

class I18N {
    functions: { locales: aws.lambda.Function; graphql: aws.lambda.Function };
    constructor({ env, dbProxy }: { env: { [key: string]: any }; dbProxy: aws.lambda.Function }) {
        const graphql = new aws.lambda.Function("i18n-graphql", {
            role: defaultLambdaRole.role.arn,
            runtime: "nodejs12.x",
            handler: "handler.handler",
            timeout: 30,
            memorySize: 512,
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive("./code/i18n/graphql/build")
            }),
            environment: {
                variables: env
            },
            vpcConfig: {
                subnetIds: vpc.subnets.private.map(subNet => subNet.id),
                securityGroupIds: [vpc.vpc.defaultSecurityGroupId]
            }
        });

        const locales = new aws.lambda.Function("i18n-locales", {
            role: defaultLambdaRole.role.arn,
            runtime: "nodejs12.x",
            handler: "handler.handler",
            timeout: 30,
            memorySize: 256,
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive("./code/i18n/locales/build")
            }),
            environment: {
                variables: {
                    DB_PROXY_FUNCTION: dbProxy.arn,
                    DEBUG: String(process.env.DEBUG)
                }
            },
            vpcConfig: {
                subnetIds: vpc.subnets.private.map(subNet => subNet.id),
                securityGroupIds: [vpc.vpc.defaultSecurityGroupId]
            }
        });

        this.functions = { graphql, locales };
    }
}

export default I18N;

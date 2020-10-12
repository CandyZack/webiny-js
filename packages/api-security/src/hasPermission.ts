import minimatch from "minimatch";
import { GraphQLFieldResolver } from "@webiny/graphql/types";
import { ErrorResponse } from "@webiny/commodo-graphql";

const checkPermission = (permission: any) => {
    return (resolver: GraphQLFieldResolver) => {
        return async (parent, args, context, info) => {
            const perms = await context.security.getPermissions();

            if (perms.find(p => minimatch(permission, p.name))) {
                return resolver(parent, args, context, info);
            }

            return new ErrorResponse({
                message: "Not authorized!",
                code: "SECURITY_NOT_AUTHORIZED"
            });
        };
    };
};

export const hasCmsPermission = (permission: any, checkPermission: Function) => {
    return (resolver: GraphQLFieldResolver) => {
        return async (parent, args, context, info) => {
            const perms = await context.security.getPermissions();
            const matchedPermission = perms.find(p => minimatch(permission, p.name));

            if (matchedPermission) {
                const allowed = await checkPermission({
                    args,
                    permission: matchedPermission,
                    context
                });

                if (!allowed) {
                    return new ErrorResponse({
                        message: "Not authorized! Missing permission required for the operation!",
                        code: "SECURITY_NOT_AUTHORIZED",
                        data: { allowed, permission: matchedPermission }
                    });
                }

                return resolver(parent, args, context, info);
            }

            return new ErrorResponse({
                message: "Not authorized!",
                code: "SECURITY_NOT_AUTHORIZED"
            });
        };
    };
};

export const hasScope = checkPermission;
export const hasPermission = checkPermission;

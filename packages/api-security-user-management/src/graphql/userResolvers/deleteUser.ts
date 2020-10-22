import { GraphQLFieldResolver } from "@webiny/graphql/types";
import { ErrorResponse, Response, NotFoundResponse } from "@webiny/graphql";
import { SecurityUserManagementPlugin } from "@webiny/api-security-user-management/types";
import { Batch } from "@commodo/fields-storage";
import {
    PK_USER,
    SK_USER
} from "@webiny/api-security-user-management/models/securityUserData.model";

const resolver: GraphQLFieldResolver = async (root, args, context) => {
    const { id } = args;
    const Model = context.models.SECURITY;

    const PK = `${PK_USER}#${id}`;

    try {
        // Remove `U#` items from table
        const securityRecord = await Model.findOne({ query: { PK, SK: SK_USER } });

        if (!securityRecord) {
            return new NotFoundResponse(id ? `User "${id}" not found!` : "User not found!");
        }

        const fields = ["A", "createdOn"];

        const batch = new Batch(
            ...fields.map(field => {
                return [Model, "delete", { query: { PK, SK: field } }];
            })
        );

        await batch.execute();

        const authPlugin = context.plugins.byName<SecurityUserManagementPlugin>(
            "security-user-management"
        );

        await authPlugin.deleteUser({ user: securityRecord.data }, context);

        return new Response(true);
    } catch (e) {
        return new ErrorResponse({
            code: e.code,
            message: e.message,
            data: e.data
        });
    }
};

export default resolver;

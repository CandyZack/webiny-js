import { withStorage } from "@webiny/commodo/fields-storage";
import { pipe } from "@webiny/commodo/pipe";
import ssrCache from "./ssrCache.model";
import { withId, DbProxyDriver } from "@webiny/commodo-fields-storage-db-proxy";
import { HandlerContextPlugin } from "@webiny/handler/types";
import { HandlerClientContext } from "@webiny/handler-client/types";

export default (options): HandlerContextPlugin<HandlerClientContext> => ({
    type: "context",
    name: "context-models",
    apply(context) {
        const createBase = () =>
            pipe(
                withId(),
                withStorage({
                    driver: new DbProxyDriver({
                        dbProxyFunction: process.env.DB_PROXY_FUNCTION,
                        context
                    })
                })
            )();

        const SsrCache = ssrCache({ createBase, options, context });
        context.models = {
            SsrCache
        };
    }
});

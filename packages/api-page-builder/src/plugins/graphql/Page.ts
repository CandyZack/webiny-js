import { GraphQLFieldResolver } from "graphql";
import {
    resolveCreate,
    resolveUpdate,
    resolveDelete,
    resolveGet,
    resolveList
} from "@webiny/commodo-graphql";
import { hasScope } from "@webiny/api-security";
import createRevisionFrom from "./pageResolvers/createRevisionFrom";
import listPages from "./pageResolvers/listPages";
import listPublishedPages from "./pageResolvers/listPublishedPages";
import getPublishedPage from "./pageResolvers/getPublishedPage";
import setHomePage from "./pageResolvers/setHomePage";
import oembed from "./pageResolvers/oembed";

const pageFetcher = ctx => ctx.models.PbPage;
const elementFetcher = ctx => ctx.models.PbPageElement;

const publishRevision: GraphQLFieldResolver<any, any> = (_, args, ctx, info) => {
    args.data = { published: true };

    return resolveUpdate(pageFetcher)(_, args, ctx, info);
};

export default {
    typeDefs: /* GraphQL*/ `
        extend type SecurityUser @key(fields: "id") {
            id: ID @external
        }

        type PbPage {
            id: ID
            createdBy: SecurityUser
            updatedBy: SecurityUser
            savedOn: DateTime
            publishedOn: DateTime
            category: PbCategory
            version: Int
            title: String
            snippet: String
            url: String
            fullUrl: String
            settings: PbPageSettings
            content: JSON
            published: Boolean
            isHomePage: Boolean
            isErrorPage: Boolean
            isNotFoundPage: Boolean
            locked: Boolean
            parent: ID
            revisions: [PbPage]
        }

        type PbPageSettings {
            _empty: String
        }

        type PbElement {
            id: ID
            name: String
            type: String
            category: String
            content: JSON
            preview: File
        }

        input PbElementInput {
            name: String!
            type: String!
            category: String
            content: JSON!
            preview: RefInput
        }

        input PbUpdateElementInput {
            name: String
            category: String
            content: JSON
            preview: RefInput
        }

        input PbUpdatePageInput {
            title: String
            snippet: String
            category: ID
            url: String
            settings: PbPageSettingsInput
            content: JSON
        }

        input PbPageSettingsInput {
            _empty: String
        }

        input PbCreatePageInput {
            category: ID!
        }

        type PbPageDeleteResponse {
            data: Boolean
            error: PbError
        }

        type PbPageResponse {
            data: PbPage
            error: PbError
        }

        type PbPageListResponse {
            data: [PbPage]
            meta: PbListMeta
            error: PbError
        }

        type PbElementResponse {
            data: PbElement
            error: PbError
        }

        type PbElementListResponse {
            data: [PbElement]
            meta: PbListMeta
        }

        type PbSearchTagsResponse {
            data: [String]
        }

        type PbOembedResponse {
            data: JSON
            error: PbError
        }

        input PbOEmbedInput {
            url: String!
            width: Int
            height: Int
        }

        input PbPageSortInput {
            title: Int
            publishedOn: Int
        }

        enum PbTagsRule {
          ALL
          ANY
        }

        extend type PbQuery {
            getPage(
                id: ID
                where: JSON
                sort: String
            ): PbPageResponse

            getPublishedPage(
                id: ID
                url: String
                parent: ID
                returnNotFoundPage: Boolean
                returnErrorPage: Boolean
                preview: Boolean
            ): PbPageResponse

            listPages(
                sort: JSON
                search: String
                parent: String
                limit: Int
                after: String
                before: String
            ): PbPageListResponse

            listPublishedPages(
                search: String
                category: String
                parent: String
                tags: [String]
                tagsRule: PbTagsRule
                sort: PbPageSortInput
                limit: Int
                after: String
                before: String
            ): PbPageListResponse

            listElements(limit: Int): PbElementListResponse

            # Returns existing tags based on given search term.
            searchTags(query: String!): PbSearchTagsResponse

            oembedData(
                url: String!
                width: String
                height: String
            ): PbOembedResponse
        }

        extend type PbMutation {
            createPage(
                data: PbCreatePageInput!
            ): PbPageResponse

            # Sets given page as new homepage.
            setHomePage(id: ID!): PbPageResponse

            # Create a new revision from an existing revision
            createRevisionFrom(
                revision: ID!
            ): PbPageResponse

            # Update revision
             updateRevision(
                id: ID!
                data: PbUpdatePageInput!
            ): PbPageResponse

            # Publish revision
            publishRevision(
                id: ID!
            ): PbPageResponse

            # Delete page and all of its revisions
            deletePage(
                id: ID!
            ): PbDeleteResponse

            # Delete a single revision
            deleteRevision(
                id: ID!
            ): PbDeleteResponse

            # Create element
            createElement(
                data: PbElementInput!
            ): PbElementResponse

            updateElement(
                id: ID!
                data: PbUpdateElementInput!
            ): PbElementResponse

            # Delete element
            deleteElement(
                id: ID!
            ): PbDeleteResponse

            updateImageSize: PbDeleteResponse
        },
    `,
    resolvers: {
        PbPage: {
            createdBy(page) {
                return { __typename: "SecurityUser", id: page.createdBy };
            },
            updatedBy(page) {
                return { __typename: "SecurityUser", id: page.updatedBy };
            }
        },
        PbQuery: {
            getPage: resolveGet(pageFetcher),
            listPages: hasScope("pb:page:crud")(listPages),
            listPublishedPages,
            getPublishedPage,
            listElements: hasScope("pb:element:crud")(resolveList(elementFetcher)),
            searchTags: async (
                root: any,
                args: { [key: string]: any },
                context: { [key: string]: any },
                info: { [key: string]: any }
            ) => {
                const resolver = context.plugins.byName("pb-resolver-search-tags");

                return { data: await resolver.resolve({ root, args, context, info }) };
            },
            oembedData: hasScope("pb:oembed:read")(oembed)
        },
        PbMutation: {
            // Creates a new page
            createPage: hasScope("pb:page:crud")(resolveCreate(pageFetcher)),
            // Deletes the entire page
            deletePage: hasScope("pb:page:crud")(resolveDelete(pageFetcher)),
            // Sets given page as home page.
            setHomePage,
            // Creates a revision from the given revision
            createRevisionFrom: hasScope("pb:page:crud")(createRevisionFrom),
            // Updates revision
            updateRevision: hasScope("pb:page:crud")(resolveUpdate(pageFetcher)),
            // Publish revision (must be given an exact revision ID to publish)
            publishRevision: hasScope("pb:page:crud")(publishRevision),
            // Delete a revision
            deleteRevision: hasScope("pb:page:crud")(resolveDelete(pageFetcher)),
            // Creates a new element
            createElement: hasScope("pb:page:crud")(resolveCreate(elementFetcher)),
            // Updates an element
            updateElement: hasScope("pb:page:crud")(resolveUpdate(elementFetcher)),
            // Deletes an element
            deleteElement: hasScope("pb:page:crud")(resolveDelete(elementFetcher))
        },
        PbPageSettings: {
            _empty: () => ""
        }
    }
};

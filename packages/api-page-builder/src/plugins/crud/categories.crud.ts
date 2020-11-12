// TODO remove
// @ts-nocheck
import { HandlerContextPlugin } from "@webiny/handler/types";
import { HandlerContextDb } from "@webiny/handler-db/types";
import dbArgs from "./dbArgs";
import { HandlerI18NContentContext } from "@webiny/api-i18n-content/types";
import DataLoader from "dataloader";
import { withFields, string } from "@commodo/fields";
import { validation } from "@webiny/validation";

export const PK_CATEGORY = "C";

/*withHooks({
    //     async beforeDelete() {
    //         const { PbPage } = context.models;
    //         if (await PbPage.findOne({ query: { category: this.id } })) {
    //             throw new Error("Cannot delete category because some pages are linked to it.");
    //         }
    //     }
    // }),
    */

export type Category = {
    name: string;
    slug: string;
    url: string;
    layout: string;
    createdOn: string;
    createdBy: {
        id: string;
        displayName: string;
    };
};

const UpdateDataModel = withFields({
    name: string({ validation: validation.create("minLength:1,maxLength:100") }),
    url: string({ validation: validation.create("minLength:1,maxLength:100") }),
    layout: string({ validation: validation.create("minLength:1,maxLength:100") })
})();

export default {
    type: "context",
    apply(context) {
        const { db, i18nContent } = context;
        const PK_CATEGORY = `C#${i18nContent?.locale?.code}`;

        const categoriesDataLoader = new DataLoader<string, Category>(async slugs => {
            const batch = db.batch();

            for (let i = 0; i < slugs.length; i++) {
                batch.read({
                    ...dbArgs,
                    query: { PK: PK_CATEGORY, SK: slugs[i] }
                });
            }

            const results = await batch.execute();
            return results.map(([response]) => {
                return response[0];
            });
        });

        context.categories = {
            async get(slug: string) {
                return categoriesDataLoader.load(slug);
            },
            async list(args) {
                const [categories] = await db.read<Category>({
                    ...dbArgs,
                    query: { PK: PK_CATEGORY, SK: { $gt: " " } },
                    ...args
                });

                return categories;
            },
            create(data) {
                const { name, slug, url, layout, createdOn, createdBy } = data;
                return db.create({
                    ...dbArgs,
                    data: {
                        PK: PK_CATEGORY,
                        SK: slug,
                        name,
                        slug,
                        url,
                        layout,
                        createdOn,
                        createdBy
                    }
                });
            },
            async update(slug, data) {
                const updateData = new UpdateDataModel().populate(data);
                await updateData.validate();

                data = await updateData.toJSON({ onlyDirty: true });

                await db.update({
                    ...dbArgs,
                    query: { PK: PK_CATEGORY, SK: slug },
                    data
                });

                return data;
            },
            delete(slug: string) {
                return db.delete({
                    ...dbArgs,
                    query: { PK: PK_CATEGORY, SK: slug }
                });
            }
        };
    }
} as HandlerContextPlugin<HandlerI18NContentContext, HandlerContextDb>;

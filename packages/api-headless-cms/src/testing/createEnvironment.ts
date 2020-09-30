export const environmentId = "e1e1e1e1e1e1e1e1e1e1e1e1";

export default ({ database }) =>
    database.collection("CmsEnvironment").insert({
        id: environmentId,
        name: "Initial Environment",
        slug: "initial-environment",
        description: "This is the initial environment.",
        createdFrom: null
    });

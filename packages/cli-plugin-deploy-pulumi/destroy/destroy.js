const { basename } = require("path");
const { red, green } = require("chalk");
const path = require("path");
const { Pulumi } = require("@webiny/pulumi-sdk");

const getStackName = folder => {
    folder = folder.split("/").pop();
    return folder === "." ? basename(process.cwd()) : folder;
};

const processHooks = async (hook, { context, ...options }) => {
    const plugins = context.plugins.byType(hook);

    for (let i = 0; i < plugins.length; i++) {
        try {
            await plugins[i].hook(options, context);
        } catch (err) {
            console.log(`🚨 Hook ${green(plugins[i].name)} encountered an error: ${err.message}`);
        }
    }
};

module.exports = async (inputs, context) => {
    const { env, folder, debug = true } = inputs;
    const stacksDir = path.join(".", folder);

    const projectRoot = context.paths.projectRoot;

    if (env) {
        // Load .env.json from project root.
        await context.loadEnv(path.resolve(projectRoot, ".env.json"), env, { debug });

        // Load .env.json from cwd (this will change depending on the folder you specified).
        await context.loadEnv(path.resolve(projectRoot, folder, ".env.json"), env, { debug });
    }

    const pulumi = new Pulumi({
        execa: {
            cwd: stacksDir,
            env: { PULUMI_CONFIG_PASSPHRASE: process.env.PULUMI_CONFIG_PASSPHRASE }
        }
    });

    const stack = getStackName(folder);

    let stackExists = true;
    try {
        await pulumi.run({ command: ["stack", "select", env] });
    } catch (e) {
        stackExists = false;
    }

    if (!stackExists) {
        console.log(`⚠️ ${red(stack)} does not exist!`);
        return;
    }

    const hooksParams = { context, env, stack };

    await processHooks("hook-before-destroy", hooksParams);
    await processHooks("hook-stack-before-destroy", hooksParams);

    await pulumi.run({
        command: "destroy",
        execa: { stdio: "inherit" },
        args: {
            yes: true
        }
    });

    console.log(`\n🎉 Done! Resources destroyed.`);

    await processHooks("hook-stack-after-destroy", hooksParams);
    await processHooks("hook-after-destroy", hooksParams);
};

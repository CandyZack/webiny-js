import React, { ReactNode, FunctionComponentElement } from "react";
import warning from "warning";
import { getPlugin, getPlugins } from "@webiny/plugins";
import { Plugin } from "@webiny/plugins/types";
import fileUploadPlugin from "./fileUploader";
import imagePlugin from "./image";

export { fileUploadPlugin, imagePlugin };

type RenderPluginOptions<T> = {
    wrapper?: boolean;
    fn?: string;
    filter?: (value: T, index: number, array: T[]) => boolean;
    reverse?: boolean;
};

interface RenderPlugin {
    <T extends Plugin = Plugin>(name: string, params?: any, options?: RenderPluginOptions<T>):
        | ReactNode
        | ReactNode[];
}

interface RenderPlugins {
    <T extends Plugin = Plugin>(type: string, params?: any, options?: RenderPluginOptions<T>):
        | ReactNode
        | ReactNode[];
}

const PluginComponent = (props: { [key: string]: any }): FunctionComponentElement<{}> =>
    props.children;
const PluginsComponent = (props: { [key: string]: any }): FunctionComponentElement<{}> =>
    props.children;

export const renderPlugin: RenderPlugin = (name, params = {}, options = {}) => {
    const { wrapper = true, fn = "render" } = options;

    const plugin = getPlugin(name);
    warning(plugin, `No such plugin "${name}"`);

    if (!plugin) {
        return null;
    }

    const content = plugin[fn](params);
    if (content) {
        return wrapper ? (
            <PluginComponent key={plugin.name} name={name} params={params} fn={fn}>
                {content}
            </PluginComponent>
        ) : (
            React.cloneElement(content, { key: plugin.name })
        );
    }
    return null;
};

export const renderPlugins: RenderPlugins = (type, params = {}, options = {}) => {
    const { wrapper = true, fn = "render", filter = v => v, reverse } = options;

    const content = getPlugins(type)
        .filter(filter)
        .map(plugin => renderPlugin(plugin.name, params, { wrapper, fn }));

    if (reverse) {
        content.reverse();
    }

    return wrapper ? (
        <PluginsComponent type={type} params={params} fn={fn}>
            {content}
        </PluginsComponent>
    ) : (
        content
    );
};

export default [imagePlugin, fileUploadPlugin];

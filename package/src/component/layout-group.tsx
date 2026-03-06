import { createMemo, createSignal, type FlowComponent } from "solid-js";
import { nodeGroup } from "motion-dom";
import {
  LayoutGroupContext,
  useLayoutGroupContext,
  type LayoutGroupContextValue,
} from "./layout-group-context";

type InheritOption = boolean | "id";

export interface LayoutGroupProps {
  id?: string;
  inherit?: InheritOption;
}

const shouldInheritGroup = (inherit: InheritOption) => inherit === true;

const shouldInheritId = (inherit: InheritOption) =>
  inherit === true || inherit === "id";

export const LayoutGroup: FlowComponent<LayoutGroupProps> = (props) => {
  const parent = useLayoutGroupContext();
  const [renderVersion, setRenderVersion] = createSignal(0);

  const context = createMemo<LayoutGroupContextValue>(() => {
    const inherit = props.inherit ?? true;
    const upstreamId = parent.id;
    const id =
      shouldInheritId(inherit) && upstreamId
        ? props.id
          ? `${upstreamId}-${props.id}`
          : upstreamId
        : props.id;

    return {
      id,
      group: shouldInheritGroup(inherit)
        ? (parent.group ?? nodeGroup())
        : nodeGroup(),
      forceRender: () => setRenderVersion((version) => version + 1),
    };
  });

  renderVersion();

  return (
    <LayoutGroupContext.Provider value={context()}>
      {props.children}
    </LayoutGroupContext.Provider>
  );
};

import type { Variant } from "../../src";

const resolverReturningObject: Variant<"div"> = (custom) => ({
  opacity: custom ? 1 : 0,
});

const resolverReturningLabel: Variant<"div"> = () => "hidden";

// @ts-expect-error variant resolver cannot return a number
const resolverReturningNumber: Variant<"div"> = () => 1;

void resolverReturningObject;
void resolverReturningLabel;
void resolverReturningNumber;

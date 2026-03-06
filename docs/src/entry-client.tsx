// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

export default function entryClient() {
  return mount(() => <StartClient />, document.getElementById("app")!);
}

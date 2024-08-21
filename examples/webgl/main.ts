import { EventManager } from "../../src/EventManager";
import { WebGLRenderer } from "../../src/renderer/WebGLRenderer";
import { isWindowDefined, settings } from "../../src/consts";
import { paint } from "../../src/layout/paint";
import { parseTTF } from "../../src/font/parseTTF";
import { prepareLookups } from "../../src/font/prepareLookups";
import { renderFontAtlas } from "../../src/font/renderFontAtlas";
import { ui } from "./ui";
import { invariant } from "../../src/utils/invariant";
import { compose } from "../../src/layout/compose";
import { UserEventType } from "../../src/layout/eventTypes";

const eventManager = new EventManager();

async function initialize() {
  const alphabet =
    "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890 ,.:•-–()[]{}!?@#$%^&*+=/\\|<>`~’'\";_▶";
  const [interTTF, interBoldTTF, comicNeueTTF, jetBrainsMonoTTF] = await Promise.all(
    ["/Inter.ttf", "/Inter-SemiBold.ttf", "/ComicNeue-Bold.ttf", "/JetBrainsMono-Regular.ttf"].map(
      (url) => fetch(url).then((response) => response.arrayBuffer()),
    ),
  );
  invariant(interTTF, "Inter.ttf not found.");
  invariant(interBoldTTF, "Inter-SemiBold.ttf not found.");
  invariant(comicNeueTTF, "ComicNeue-Bold.ttf not found.");
  invariant(jetBrainsMonoTTF, "JetBrainsMono-Regular.ttf not found.");

  document.body.setAttribute("style", "margin: 0");

  const canvas = document.createElement("canvas");
  canvas.width = settings.windowWidth * window.devicePixelRatio;
  canvas.height = settings.windowHeight * window.devicePixelRatio;
  canvas.setAttribute(
    "style",
    `width: ${settings.windowWidth}px; height: ${settings.windowHeight}px; display: flex; position: fixed`,
  );
  document.body.append(canvas);
  const context = canvas.getContext("webgl2");
  invariant(context, "WebGL 2.0 is not supported in this browser.");

  const lookups = prepareLookups(
    [
      { buffer: interTTF, name: "Inter", ttf: parseTTF(interTTF) },
      { buffer: interBoldTTF, name: "InterBold", ttf: parseTTF(interBoldTTF) },
      { buffer: comicNeueTTF, name: "ComicNeue", ttf: parseTTF(comicNeueTTF) },
      { buffer: jetBrainsMonoTTF, name: "JetBrainsMono", ttf: parseTTF(jetBrainsMonoTTF) },
    ],
    { alphabet, fontSize: 150 },
  );

  const fontAtlas = await renderFontAtlas(lookups, { useSDF: true });

  const renderer = new WebGLRenderer(canvas, context, lookups, fontAtlas);

  const root = ui(renderer);

  // Notify nodes that layout is ready.
  eventManager.dispatchEvent({ bubbles: false, capturable: false, type: UserEventType.Layout });
  eventManager.deliverEvents(root);

  function render(): void {
    invariant(context, "WebGL 2.0 is not supported in this browser.");

    eventManager.deliverEvents(root);
    compose(renderer, root);
    paint(renderer, root);

    renderer.render();

    requestAnimationFrame(render);
  }

  render();
}

if (isWindowDefined) {
  await initialize();
}

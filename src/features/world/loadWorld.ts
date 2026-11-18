import type { CreateWorld } from "./types";

const SOFTWARE_RENDERER = /SwiftShader|llvmpipe|softpipe|Software/i;

function softwareAllowed(): boolean {
  return new URLSearchParams(window.location.search).get("soft") === "1";
}

function webglProblem(): string | null {
  if (softwareAllowed()) return null;
  const canvas = document.createElement("canvas");
  const gl = (canvas.getContext("webgl2") ??
    canvas.getContext("webgl")) as WebGLRenderingContext | null;
  if (!gl) return "webgl: unavailable";
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(
    gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
  );
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return SOFTWARE_RENDERER.test(renderer) ? "webgl: software renderer" : null;
}

export async function loadCreateWorld(): Promise<CreateWorld> {
  const problem = webglProblem();
  if (problem) return () => Promise.reject(new Error(problem));
  const module = (await import("@viewer/world.js")) as {
    createWorld?: CreateWorld;
  };
  const create = module.createWorld;
  if (typeof create !== "function")
    throw new Error("world.js has no createWorld");
  const base = import.meta.env.VITE_WORLD_BASE;
  const allowSoftware = softwareAllowed() || undefined;
  if (!base)
    return allowSoftware
      ? (canvas, options) => create(canvas, { ...options, allowSoftware })
      : create;
  return (canvas, options) => {
    const built = {
      ...options,
      allowSoftware,
      base,
      cacheBust: false,
      fetchCache: "default",
      dracoPath: `${base}draco/`,
      gzipped: [`${options.id}.glb`],
    };
    return create(canvas, built);
  };
}

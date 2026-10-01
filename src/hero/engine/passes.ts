import type { Spread } from '../../split/dissolve';
import type { SplitId } from '../../split/types';
import type { LoadedAtlas } from './atlas';
import { BAYER8, STRIP_WIDTH, type Strip } from './backdrop';
import type { View } from './camera';
import { createProgram, createTarget, createTexture, deleteTarget, type GL, type Target } from './gl';
import { BACKDROP_FS, FULLSCREEN_VS, PRESENT_FS, SPRITE_FS, SPRITE_VS } from './shaders';
import { INSTANCE_SIZE } from './stage';

/**
 * Everything that lives on the GPU, and the two steps of a frame:
 * paint() draws one staging at art resolution into an off-screen target, and
 * present() scales that up to the canvas by a whole number. There are two
 * targets so that, during a split dissolve, both stagings can be painted and
 * present() can choose between them block by block.
 */
export interface Renderer {
  resize(view: View): void;
  /** `slot` 0 is the staging on show; slot 1 is the one a dissolve is heading for. `light` is LIGHT_SIZE numbers. */
  paint(slot: 0 | 1, split: SplitId, view: View, instances: Int16Array, count: number, light: Int32Array): void;
  /** With `dissolve`, blocks past their threshold show slot 1. */
  present(view: View, dissolve?: { progress: number; spread: Spread }): void;
  /** GPU draw calls made since this was last set to 0. */
  calls: number;
  dispose(): void;
}

// Texture units, fixed for the life of the renderer.
const MAIN = 0; // strip, atlas, or the scene on show
const NEXT = 1; // the scene being dissolved to
const BAYER = 2; // the ordered-dither table

export function createRenderer(gl: GL, atlas: LoadedAtlas, strips: Record<SplitId, Strip>): Renderer {
  const backdrop = createProgram(gl, FULLSCREEN_VS, BACKDROP_FS, ['u_strip', 'u_camera', 'u_top']);
  const sprites = createProgram(gl, SPRITE_VS, SPRITE_FS, ['u_atlas', 'u_bayer', 'u_view', 'u_light', 'u_strength']);
  const present = createProgram(gl, FULLSCREEN_VS, PRESENT_FS, ['u_scene', 'u_next', 'u_bayer', 'u_k', 'u_height', 'u_progress', 'u_spread']);

  const atlasTexture = createTexture(gl, atlas.image);
  const strip = (s: Strip) => createTexture(gl, { width: STRIP_WIDTH, height: s.height, data: s.pixels }, true);
  const stripTextures: Record<SplitId, WebGLTexture> = { creative: strip(strips.creative), tech: strip(strips.tech) };
  const bayer = createTexture(gl, { width: 8, height: 8, data: new Uint8Array(BAYER8.flatMap((value) => [value, 0, 0, 255])) });

  // Each sampler keeps to its unit; the dither table stays bound to its own for good.
  gl.useProgram(backdrop.program);
  gl.uniform1i(backdrop.at.u_strip, MAIN);
  gl.useProgram(sprites.program);
  gl.uniform1i(sprites.at.u_atlas, MAIN);
  gl.uniform1i(sprites.at.u_bayer, BAYER);
  gl.useProgram(present.program);
  gl.uniform1i(present.at.u_scene, MAIN);
  gl.uniform1i(present.at.u_next, NEXT);
  gl.uniform1i(present.at.u_bayer, BAYER);
  gl.activeTexture(gl.TEXTURE0 + BAYER);
  gl.bindTexture(gl.TEXTURE_2D, bayer);
  gl.activeTexture(gl.TEXTURE0 + MAIN); // every other texture is made and bound on this one

  // The full-screen passes take no vertex data, but WebGL still wants a vertex array bound.
  const noAttributes = gl.createVertexArray();

  // Sprites: one shared unit quad, plus INSTANCE_SIZE whole numbers per instance.
  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const instanceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  const stride = INSTANCE_SIZE * 2; // bytes: each number is a 16-bit integer
  for (const [location, offset] of [[1, 0], [2, 8]]) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 4, gl.SHORT, false, stride, offset);
    gl.vertexAttribDivisor(location, 1);
  }
  gl.bindVertexArray(null);
  let capacity = 0;

  gl.disable(gl.DITHER);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);

  const targets: (Target | null)[] = [null, null];

  const renderer: Renderer = {
    calls: 0,

    resize(view) {
      targets.forEach((target, slot) => {
        if (target && target.width === view.w && target.height === view.h) return;
        deleteTarget(gl, target);
        targets[slot] = createTarget(gl, view.w, view.h);
      });
    },

    paint(slot, split, view, instances, count, light) {
      const target = targets[slot];
      if (!target) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.viewport(0, 0, target.width, target.height);
      gl.activeTexture(gl.TEXTURE0 + MAIN);

      gl.useProgram(backdrop.program);
      gl.bindTexture(gl.TEXTURE_2D, stripTextures[split]);
      gl.uniform2i(backdrop.at.u_camera, view.x, view.y);
      gl.uniform1i(backdrop.at.u_top, strips[split].top);
      gl.bindVertexArray(noAttributes);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(sprites.program);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.uniform2f(sprites.at.u_view, view.w, view.h);
      gl.uniform4i(sprites.at.u_light, light[0], light[1], light[2], light[3]);
      gl.uniform1i(sprites.at.u_strength, light[4]);
      gl.bindVertexArray(quad);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      if (instances.length > capacity) {
        capacity = instances.length;
        gl.bufferData(gl.ARRAY_BUFFER, instances, gl.DYNAMIC_DRAW);
      } else {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances.subarray(0, count * INSTANCE_SIZE));
      }
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      renderer.calls += 2;
    },

    present(view, dissolve) {
      const [scene, next] = targets;
      if (!scene || !next) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(present.program);
      gl.activeTexture(gl.TEXTURE0 + NEXT);
      gl.bindTexture(gl.TEXTURE_2D, next.texture);
      gl.activeTexture(gl.TEXTURE0 + MAIN);
      gl.bindTexture(gl.TEXTURE_2D, scene.texture);
      gl.uniform1i(present.at.u_k, view.k);
      gl.uniform1i(present.at.u_height, gl.drawingBufferHeight);
      gl.uniform1f(present.at.u_progress, dissolve?.progress ?? 0);
      gl.uniform3f(present.at.u_spread, dissolve?.spread.x ?? 0, dissolve?.spread.y ?? 0, dissolve?.spread.reach ?? 1);
      gl.bindVertexArray(noAttributes);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      renderer.calls += 1;
    },

    dispose() {
      targets.forEach((target) => deleteTarget(gl, target));
      targets.fill(null);
      for (const texture of [atlasTexture, stripTextures.creative, stripTextures.tech, bayer]) gl.deleteTexture(texture);
      gl.deleteBuffer(corners);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteVertexArray(quad);
      gl.deleteVertexArray(noAttributes);
      for (const { program } of [backdrop, sprites, present]) gl.deleteProgram(program);
    },
  };
  return renderer;
}

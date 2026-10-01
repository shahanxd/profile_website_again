import { BLOCK, SPREAD } from '../../split/dissolve';

/**
 * The two programs. Both work in whole pixels: textures are read with
 * texelFetch (no filtering, no texture coordinates to round), so a colour that
 * goes in comes out unchanged. Precision is highp throughout: mediump may
 * be 16-bit on phones, which is not enough to address a pixel on a 4K canvas.
 *
 * Row 0 of the art is row 0 of the art-resolution framebuffer; the only flip
 * happens once, in PRESENT.
 *
 * u_bayer is the 8x8 ordered-dither table from dither.ts as a texture, its
 * values (0..63) in the red channel as whole bytes.
 */

/** One triangle that covers the whole target; needs no vertex data. */
export const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Every sprite and particle in one instanced draw. Per instance: where it goes on screen and where it is in the atlas. */
export const SPRITE_VS = `#version 300 es
layout(location = 0) in vec2 a_corner; // unit quad
layout(location = 1) in vec4 a_dest;   // x, y, w, h in view art pixels
layout(location = 2) in vec2 a_source; // atlas texel of the frame's top-left
uniform vec2 u_view;                   // visible art pixels
out vec2 v_texel;
void main() {
  v_texel = a_source + a_corner * a_dest.zw;
  gl_Position = vec4((a_dest.xy + a_corner * a_dest.zw) / u_view * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Alpha is all or nothing: a pixel is drawn or it is not. Nothing is ever blended. */
export const SPRITE_FS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_atlas;
in vec2 v_texel;
out vec4 color;
void main() {
  color = texelFetch(u_atlas, ivec2(v_texel), 0);
  if (color.a < 0.5) discard;
}`;

/**
 * Scales the art up by exactly k: every art pixel becomes a k x k block of
 * device pixels. During a split dissolve it also chooses, block by block,
 * between the staging on show and the one arriving; threshold() in
 * src/split/dissolve.ts is the same sum, which keeps the page overlay in step.
 */
export const PRESENT_FS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_scene;
uniform highp sampler2D u_next;  // the staging being dissolved to
uniform highp sampler2D u_bayer;
uniform int u_k;          // device pixels per art pixel
uniform int u_height;     // canvas height in device pixels
uniform float u_progress; // 0 shows u_scene everywhere, 1 shows u_next everywhere
uniform vec3 u_spread;    // where the dissolve starts (x, y) and how far it travels, in blocks
out vec4 color;
void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  ivec2 art = ivec2(pixel.x, u_height - 1 - pixel.y) / u_k;
  ivec2 block = art / ${BLOCK};
  float far = min(length(vec2(block) + 0.5 - u_spread.xy) / u_spread.z, 1.0);
  float dither = (texelFetch(u_bayer, block & 7, 0).r * 255.0 + 0.5) / 64.0;
  float threshold = ${SPREAD.toFixed(4)} * far + ${(1 - SPREAD).toFixed(4)} * dither;
  if (u_progress > threshold) color = texelFetch(u_next, art, 0);
  else color = texelFetch(u_scene, art, 0);
}`;
